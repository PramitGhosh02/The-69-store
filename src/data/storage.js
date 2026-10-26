const STORAGE_KEY = 'the69store_orders';
const COUNTER_KEY = 'the69store_last_order_num';
const SESSION_KEY = 'the69store_supabase_session';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudDatabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Request persistent storage from browser so orders stay saved permanently
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function getAccessToken() {
  const session = getStoredSession();
  if (!session?.access_token) throw new Error('Please sign in again to access the shared database.');

  if (session.expires_at && session.expires_at * 1000 < Date.now() + 30000) {
    if (!session.refresh_token) throw new Error('Your session expired. Please sign in again.');
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const refreshed = await response.json();
    if (!response.ok) {
      clearStoredSession();
      throw new Error(refreshed.msg || refreshed.message || 'Your session expired. Please sign in again.');
    }
    const nextSession = { ...refreshed, expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    return nextSession.access_token;
  }
  return session.access_token;
}

export async function signIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.msg || result.message || 'Unable to sign in. Check your email and password.');
  }
  const session = { ...result, expires_at: Math.floor(Date.now() / 1000) + result.expires_in };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function cloudRequest(path, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || result.details || 'The shared database request failed. Please try again.');
  }
  if (response.status === 204) return null;
  return response.json();
}

function loadLocalOrders() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function loadOrders() {
  if (!cloudDatabaseEnabled) return loadLocalOrders();
  const rows = await cloudRequest('orders?select=payload');
  return rows.map((row) => row.payload).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function saveOrders(orders) {
  if (!cloudDatabaseEnabled) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    return orders;
  }
  if (orders.length) {
    await cloudRequest('orders?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(orders.map((order) => ({ id: order.id, payload: order }))),
    });
  }
  return orders;
}

export async function addOrder(order) {
  if (cloudDatabaseEnabled) {
    await cloudRequest('orders?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: order.id, payload: order }),
    });
    return order;
  }
  const orders = loadLocalOrders();
  orders.unshift(order);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  return order;
}

export async function updateOrder(orderId, updatedOrder) {
  if (cloudDatabaseEnabled) {
    const orders = await loadOrders();
    const order = orders.find((item) => String(item.id) === String(orderId));
    if (!order) return orders;
    const nextOrder = { ...order, ...updatedOrder, updatedAt: new Date().toISOString() };
    await cloudRequest(`orders?id=eq.${encodeURIComponent(String(orderId))}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ payload: nextOrder }),
    });
    return loadOrders();
  }
  const orders = loadLocalOrders();
  const idx = orders.findIndex((o) => String(o.id) === String(orderId));
  if (idx !== -1) {
    orders[idx] = { ...orders[idx], ...updatedOrder, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }
  return orders;
}

export async function deleteOrder(orderId) {
  if (cloudDatabaseEnabled) {
    await cloudRequest(`orders?id=eq.${encodeURIComponent(String(orderId))}`, { method: 'DELETE' });
    return loadOrders();
  }
  const orders = loadLocalOrders().filter((o) => String(o.id) !== String(orderId));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));

  // Recalculate highest order ID so the order sequence counter stays aligned with remaining orders
  let maxId = 0;
  for (const o of orders) {
    const val = parseInt(o.id, 10);
    if (!isNaN(val) && val > maxId) {
      maxId = val;
    }
  }
  localStorage.setItem(COUNTER_KEY, String(maxId));

  return orders;
}

export async function clearAllOrders() {
  if (cloudDatabaseEnabled) {
    await cloudRequest('orders?id=not.is.null', { method: 'DELETE' });
    return [];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(COUNTER_KEY, '0');
  return [];
}

export async function importOrdersJSON(jsonString, mode = 'merge') {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const imported = Array.isArray(parsed) ? parsed : parsed?.orders;
  if (!Array.isArray(imported) || imported.some((order) => (
    !order || (typeof order.id !== 'string' && typeof order.id !== 'number') || !String(order.id).trim() ||
    typeof order.createdAt !== 'string' || !Array.isArray(order.items) ||
    !order.items.every((item) => item && typeof item.name === 'string' && Number.isFinite(item.qty) && item.qty > 0)
  ))) {
    throw new Error('The backup must contain orders with an ID, date, and valid items.');
  }
  if (new Set(imported.map((order) => String(order.id))).size !== imported.length) {
    throw new Error('The backup contains duplicate order IDs.');
  }

  let result = imported;
  if (mode === 'merge') {
    const current = await loadOrders();
    const merged = new Map(current.map((order) => [String(order.id), order]));
    imported.forEach((order) => merged.set(String(order.id), order));
    result = [...merged.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (cloudDatabaseEnabled) {
    await clearAllOrders();
  }
  await saveOrders(result);
  return result;
}

export function generateOrderId() {
  const orders = loadLocalOrders();
  let maxInOrders = 0;
  for (const o of orders) {
    const val = parseInt(o.id, 10);
    if (!isNaN(val) && val > maxInOrders) {
      maxInOrders = val;
    }
  }
  let lastNum = 0;
  try {
    lastNum = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
    if (isNaN(lastNum)) lastNum = 0;
  } catch {
    lastNum = 0;
  }
  const nextNum = Math.max(maxInOrders, lastNum) + 1;
  try {
    localStorage.setItem(COUNTER_KEY, String(nextNum));
  } catch {}
  return nextNum;
}

export function exportOrdersCSV(orders) {
  if (orders.length === 0) return null;

  const header = ['Order ID', 'Date', 'Time', 'Created By', 'Customer', 'Item', 'Option', 'Qty', 'Unit Price', 'Line Total', 'Order Total', 'Status'];
  const rows = [];

  orders.forEach((order) => {
    const d = new Date(order.createdAt);
    const date = d.toLocaleDateString('en-IN');
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    order.items.forEach((item) => {
      rows.push([
        order.id,
        date,
        time,
        order.createdBy,
        order.customerName || 'Walk-in',
        item.name,
        item.option || '—',
        item.qty,
        item.price,
        item.price * item.qty,
        order.total,
        order.status,
      ]);
    });
  });

  const csvContent = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

export function exportOrdersJSON(orders) {
  return JSON.stringify({ format: 'the69store-orders', version: 1, exportedAt: new Date().toISOString(), orders }, null, 2);
}

export function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(jsonString, filename) {
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'the69store_orders';
const COUNTER_KEY = 'the69store_last_order_num';
const SUPABASE_CONFIG_KEY = 'the69store_supabase_config';

// 1. Check environment variables
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Also allow stored credentials (from in-app settings if configured)
function getSavedSupabaseConfig() {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSupabaseConfig(url, key) {
  if (!url || !key) {
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
  } else {
    localStorage.setItem(
      SUPABASE_CONFIG_KEY,
      JSON.stringify({ url: url.trim().replace(/\/$/, ''), key: key.trim() })
    );
  }
  window.location.reload();
}

const savedConfig = getSavedSupabaseConfig();
export const activeSupabaseUrl = ENV_SUPABASE_URL || savedConfig?.url || '';
export const activeSupabaseKey = ENV_SUPABASE_ANON_KEY || savedConfig?.key || '';

export const cloudDatabaseEnabled = Boolean(activeSupabaseUrl && activeSupabaseKey);

// Initialize Supabase client if configured
export const supabase = cloudDatabaseEnabled
  ? createClient(activeSupabaseUrl, activeSupabaseKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

// Request persistent storage from browser so local copy never gets evicted
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}

export function loadLocalOrders() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {}
}

export async function loadOrders() {
  if (!cloudDatabaseEnabled || !supabase) {
    return loadLocalOrders();
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('payload')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const cloudOrders = (data || []).map((row) => row.payload);
    // Keep local storage synchronized as an offline cache
    saveLocalOrders(cloudOrders);
    return cloudOrders;
  } catch (err) {
    console.warn('Could not load from Supabase, using local orders:', err.message);
    return loadLocalOrders();
  }
}

export async function saveOrders(orders) {
  saveLocalOrders(orders);
  if (cloudDatabaseEnabled && supabase && orders.length) {
    try {
      await supabase.from('orders').upsert(
        orders.map((o) => ({ id: String(o.id), payload: o }))
      );
    } catch (err) {
      console.warn('Supabase save error:', err);
    }
  }
  return orders;
}

export async function addOrder(order) {
  // Save locally first
  const local = loadLocalOrders();
  local.unshift(order);
  saveLocalOrders(local);

  if (cloudDatabaseEnabled && supabase) {
    try {
      const { error } = await supabase
        .from('orders')
        .upsert({ id: String(order.id), payload: order });
      if (error) console.warn('Supabase addOrder error:', error.message);
    } catch (err) {
      console.warn('Supabase addOrder failed:', err);
    }
  }
  return order;
}

export async function updateOrder(orderId, updatedFields) {
  const local = loadLocalOrders();
  const idx = local.findIndex((o) => String(o.id) === String(orderId));
  let updatedOrder = null;

  if (idx !== -1) {
    local[idx] = {
      ...local[idx],
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };
    updatedOrder = local[idx];
    saveLocalOrders(local);
  }

  if (cloudDatabaseEnabled && supabase && updatedOrder) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payload: updatedOrder })
        .eq('id', String(orderId));
      if (error) console.warn('Supabase updateOrder error:', error.message);
    } catch (err) {
      console.warn('Supabase updateOrder failed:', err);
    }
  }
  return local;
}

export async function deleteOrder(orderId) {
  const local = loadLocalOrders().filter((o) => String(o.id) !== String(orderId));
  saveLocalOrders(local);

  // Realign local sequence counter
  let maxId = 0;
  for (const o of local) {
    const val = parseInt(o.id, 10);
    if (!isNaN(val) && val > maxId) {
      maxId = val;
    }
  }
  try {
    localStorage.setItem(COUNTER_KEY, String(maxId));
  } catch {}

  if (cloudDatabaseEnabled && supabase) {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', String(orderId));
      if (error) console.warn('Supabase deleteOrder error:', error.message);
    } catch (err) {
      console.warn('Supabase deleteOrder failed:', err);
    }
  }

  return local;
}

export async function clearAllOrders() {
  saveLocalOrders([]);
  try {
    localStorage.setItem(COUNTER_KEY, '0');
  } catch {}

  if (cloudDatabaseEnabled && supabase) {
    try {
      await supabase.from('orders').delete().neq('id', '___non_existent___');
    } catch (err) {
      console.warn('Supabase clearAllOrders error:', err);
    }
  }
  return [];
}

/** Subscribe to live real-time updates across all connected devices */
export function subscribeToOrders(onUpdate) {
  if (cloudDatabaseEnabled && supabase) {
    const channel = supabase
      .channel('realtime:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (change) => {
          console.log('Realtime change received from Supabase:', change);
          const fresh = await loadOrders();
          onUpdate(fresh);
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Cross-tab fallback for same browser
  const handleStorage = (e) => {
    if (e.key === STORAGE_KEY) {
      onUpdate(loadLocalOrders());
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
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

  const header = [
    'Order ID',
    'Date',
    'Time',
    'Created By',
    'Customer',
    'Item',
    'Option',
    'Qty',
    'Unit Price',
    'Line Total',
    'Order Total',
    'Status',
  ];
  const rows = [];

  orders.forEach((order) => {
    const d = new Date(order.createdAt);
    const date = d.toLocaleDateString('en-IN');
    const time = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

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

  return [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function exportOrdersJSON(orders) {
  return JSON.stringify(
    {
      format: 'the69store-orders',
      version: 1,
      exportedAt: new Date().toISOString(),
      orders,
    },
    null,
    2
  );
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

export async function importOrdersJSON(jsonString, mode = 'merge') {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const imported = Array.isArray(parsed) ? parsed : parsed?.orders;
  if (
    !Array.isArray(imported) ||
    imported.some(
      (order) =>
        !order ||
        (typeof order.id !== 'string' && typeof order.id !== 'number') ||
        !String(order.id).trim() ||
        typeof order.createdAt !== 'string' ||
        !Array.isArray(order.items) ||
        !order.items.every(
          (item) =>
            item &&
            typeof item.name === 'string' &&
            Number.isFinite(item.qty) &&
            item.qty > 0
        )
    )
  ) {
    throw new Error('The backup must contain orders with an ID, date, and valid items.');
  }

  let result = imported;
  if (mode === 'merge') {
    const current = await loadOrders();
    const merged = new Map(current.map((order) => [String(order.id), order]));
    imported.forEach((order) => merged.set(String(order.id), order));
    result = [...merged.values()].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  } else {
    await clearAllOrders();
  }

  await saveOrders(result);
  return result;
}

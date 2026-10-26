import { useState, useEffect } from 'react';
import { loadOrders, deleteOrder, updateOrder } from '../data/storage';
import { TEAM_MEMBERS } from '../data/menu';

export default function OrdersPage({ refreshKey, onEditOrder, onOrderDeleted }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [editingCustomer, setEditingCustomer] = useState(null); // orderId being inline-edited
  const [editName, setEditName] = useState('');

  useEffect(() => {
    let active = true;
    function fetchOrders() {
      loadOrders()
        .then((loadedOrders) => {
          if (active) setOrders(loadedOrders);
        })
        .catch((error) => window.alert(error.message || 'Could not load orders.'));
    }

    fetchOrders();

    const onFocus = () => fetchOrders();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchOrders();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshKey]);

  const filtered =
    filter === 'All'
      ? orders
      : orders.filter((o) => o.createdBy === filter);

  async function handleDelete(id) {
    if (window.confirm(`Delete Order #${id} permanently?`)) {
      try {
        const updated = await deleteOrder(id);
        setOrders(updated);
        if (onOrderDeleted) onOrderDeleted(id);
      } catch (error) {
        window.alert(error.message || 'Could not delete this order.');
      }
    }
  }

  async function handleStatusToggle(order) {
    const nextStatus = order.status === 'completed' ? 'pending' : 'completed';
    try {
      setOrders(await updateOrder(order.id, { status: nextStatus }));
    } catch (error) {
      window.alert(error.message || 'Could not update the order status.');
    }
  }

  function startEditCustomer(order) {
    setEditingCustomer(order.id);
    setEditName(order.customerName || '');
  }

  async function saveCustomerName(orderId) {
    try {
      setOrders(await updateOrder(orderId, {
        customerName: editName.trim() || 'Walk-in',
      }));
      setEditingCustomer(null);
    } catch (error) {
      window.alert(error.message || 'Could not update the customer name.');
    }
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  return (
    <div className="page">
      <h2 className="section-title">📋 All Orders</h2>

      <div className="orders-filters">
        {['All', ...TEAM_MEMBERS].map((f) => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-text">No orders yet</div>
        </div>
      ) : (
        filtered.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-card-header">
              <span className="order-id">#{order.id}</span>
              <span className="order-time">{formatTime(order.createdAt)}</span>
            </div>

            {/* ---- Editable customer name ---- */}
            <div className="order-by">
              👤 Taken by <strong>{order.createdBy}</strong>
              {' • Customer: '}
              {editingCustomer === order.id ? (
                <span className="inline-edit-wrap">
                  <input
                    className="inline-edit-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveCustomerName(order.id);
                      if (e.key === 'Escape') setEditingCustomer(null);
                    }}
                    autoFocus
                  />
                  <button
                    className="inline-save-btn"
                    onClick={() => saveCustomerName(order.id)}
                  >
                    ✓
                  </button>
                </span>
              ) : (
                <strong
                  className="editable-text"
                  onClick={() => startEditCustomer(order)}
                  title="Click to edit"
                >
                  {order.customerName || 'Walk-in'} ✎
                </strong>
              )}
            </div>

            {/* ---- Items ---- */}
            <div className="order-items-list">
              {order.items.map((item, i) => (
                <div key={i}>
                  {item.emoji} {item.name} × {item.qty}
                  {item.option ? ` (${item.option})` : ''}
                </div>
              ))}
            </div>

            {/* ---- Footer ---- */}
            <div className="order-card-footer">
              <span className="order-total">
                {order.total > 0 ? `₹${order.total}` : '₹ --'}
              </span>
              <div className="order-actions">
                {/* Tappable status badge: Pending / Completed */}
                <button
                  className={`order-status status-${order.status || 'pending'}`}
                  onClick={() => handleStatusToggle(order)}
                  title={`Click to mark as ${order.status === 'completed' ? 'pending' : 'completed'}`}
                >
                  {order.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                </button>

                {/* Edit full order */}
                <button
                  className="edit-order-btn"
                  onClick={() => onEditOrder(order)}
                >
                  ✏️ Edit
                </button>

                {/* Delete */}
                <button
                  className="delete-order-btn"
                  onClick={() => handleDelete(order.id)}
                >
                  🗑️
                </button>
              </div>
            </div>

            {order.updatedAt && (
              <div className="order-updated-tag">
                Updated {formatTime(order.updatedAt)}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

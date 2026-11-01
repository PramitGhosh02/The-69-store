import { useState, useEffect } from 'react';
import { loadOrders, deleteOrder, updateOrder } from '../data/storage';
import { TEAM_MEMBERS } from '../data/menu';

export default function OrdersPage({ refreshKey, onEditOrder, onOrderDeleted }) {
  const [orders, setOrders] = useState([]);
  const [teamFilter, setTeamFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All'); // 'All' | 'cash' | 'upi'
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

  const filtered = orders.filter((o) => {
    if (teamFilter !== 'All' && o.createdBy !== teamFilter) return false;
    if (paymentFilter !== 'All' && (o.paymentMethod || 'cash') !== paymentFilter) return false;
    return true;
  });

  async function handleDelete(id) {
    if (
      window.confirm(
        `Delete Order #${id}? Subsequent orders will automatically shift and renumber (e.g. Order #3 becomes #2).`
      )
    ) {
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

  async function handlePaymentToggle(order) {
    const nextPayment = (order.paymentMethod || 'cash') === 'upi' ? 'cash' : 'upi';
    try {
      setOrders(await updateOrder(order.id, { paymentMethod: nextPayment }));
    } catch (error) {
      window.alert(error.message || 'Could not update payment mode.');
    }
  }

  function startEditCustomer(order) {
    setEditingCustomer(order.id);
    setEditName(order.customerName || '');
  }

  async function saveCustomerName(orderId) {
    try {
      setOrders(
        await updateOrder(orderId, {
          customerName: editName.trim() || 'Walk-in',
        })
      );
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

      {/* Team Filters */}
      <div className="orders-filters">
        {['All', ...TEAM_MEMBERS].map((f) => (
          <button
            key={f}
            className={`filter-chip ${teamFilter === f ? 'active' : ''}`}
            onClick={() => setTeamFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Payment Mode Filters */}
      <div className="payment-filter-chips">
        <button
          className={`pay-chip ${paymentFilter === 'All' ? 'active' : ''}`}
          onClick={() => setPaymentFilter('All')}
        >
          All Payments
        </button>
        <button
          className={`pay-chip ${paymentFilter === 'cash' ? 'active-cash' : ''}`}
          onClick={() => setPaymentFilter('cash')}
        >
          💵 Cash
        </button>
        <button
          className={`pay-chip ${paymentFilter === 'upi' ? 'active-upi' : ''}`}
          onClick={() => setPaymentFilter('upi')}
        >
          📱 UPI
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-text">No orders found</div>
        </div>
      ) : (
        filtered.map((order) => {
          const isUpi = order.paymentMethod === 'upi';

          return (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="order-id">#{order.id}</span>
                  {/* Clickable payment badge */}
                  <button
                    type="button"
                    className={`payment-pill ${isUpi ? 'pill-upi' : 'pill-cash'}`}
                    onClick={() => handlePaymentToggle(order)}
                    title="Click to toggle Cash / UPI"
                  >
                    {isUpi ? '📱 UPI' : '💵 Cash'}
                  </button>
                </div>
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

              {/* ---- Comments / Instructions Display ---- */}
              {order.notes && (
                <div className="order-notes-box">
                  <span className="notes-box-icon">📝</span>
                  <span className="notes-box-text">{order.notes}</span>
                </div>
              )}

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
                    title={`Click to mark as ${
                      order.status === 'completed' ? 'pending' : 'completed'
                    }`}
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
          );
        })
      )}
    </div>
  );
}

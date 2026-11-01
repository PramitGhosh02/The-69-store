import { useState, useEffect } from 'react';
import { MENU, getMenuGroups } from '../data/menu';
import {
  addOrder,
  updateOrder,
  generateOrderId,
  loadLocalOutOfStock,
  loadOutOfStock,
  saveOutOfStock,
} from '../data/storage';
import StockManagerModal from './StockManagerModal';

/*
  Cart shape (variant-based):
  {
    'veg-sandwich|||Without Cheese': 2,
    'veg-sandwich|||With Cheese': 1,
    'chicken-cutlets': 3,
  }
*/

function cartKey(menuItemId, option) {
  return option ? `${menuItemId}|||${option}` : menuItemId;
}

function parseCartKey(key) {
  const idx = key.indexOf('|||');
  if (idx === -1) return { menuItemId: key, option: null };
  return { menuItemId: key.slice(0, idx), option: key.slice(idx + 3) };
}

/** Resolve unit price for menu item + optional choice */
function resolvePrice(menuItem, optionName) {
  if (optionName && menuItem.options) {
    const choice = menuItem.options.choices.find((c) => c.name === optionName);
    if (choice) return choice.price;
  }
  return menuItem.price || 0;
}

const QUICK_NOTE_CHIPS = ['Extra Spicy 🔥', 'No Onion 🧅', 'Parcel 🛍️', 'Less Ice 🧊'];

export default function NewOrderPage({ user, onOrderPlaced, editingOrder, onCancelEdit }) {
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'upi'
  const [notes, setNotes] = useState('');
  const [showCartDetails, setShowCartDetails] = useState(false);
  const [showStockManager, setShowStockManager] = useState(false);
  const [outOfStock, setOutOfStock] = useState(() => loadLocalOutOfStock());

  const isEditing = !!editingOrder;

  // Sync out-of-stock items from storage/cloud and live events
  useEffect(() => {
    loadOutOfStock().then((items) => {
      if (items) setOutOfStock(items);
    });

    function handleStockUpdate(e) {
      if (e.detail) setOutOfStock(e.detail);
    }

    window.addEventListener('the69store:stock_updated', handleStockUpdate);
    return () => window.removeEventListener('the69store:stock_updated', handleStockUpdate);
  }, []);

  // Load an existing order into the cart for editing
  useEffect(() => {
    if (editingOrder) {
      const newCart = {};
      editingOrder.items.forEach((item) => {
        const key = cartKey(item.id, item.option);
        newCart[key] = (newCart[key] || 0) + item.qty;
      });
      setCart(newCart);
      setCustomerName(editingOrder.customerName || '');
      setPaymentMethod(editingOrder.paymentMethod || 'cash');
      setNotes(editingOrder.notes || '');
    }
  }, [editingOrder]);

  async function handleToggleStock(itemId) {
    const next = outOfStock.includes(itemId)
      ? outOfStock.filter((id) => id !== itemId)
      : [...outOfStock, itemId];
    setOutOfStock(next);
    await saveOutOfStock(next);
  }

  async function handleResetAllStock() {
    setOutOfStock([]);
    await saveOutOfStock([]);
  }

  function isItemOutOfStock(itemId) {
    return outOfStock.includes(itemId);
  }

  function updateQty(menuItemId, option, delta) {
    // Prevent adding to cart if item is out of stock
    if (delta > 0 && isItemOutOfStock(menuItemId)) {
      window.alert('This item is currently marked as Out of Stock.');
      return;
    }

    const key = cartKey(menuItemId, option);
    setCart((prev) => {
      const current = prev[key] || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: newQty };
    });
  }

  function handleAddChip(chip) {
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      if (trimmed.includes(chip)) return trimmed;
      return `${trimmed}, ${chip}`;
    });
  }

  function getCartItems() {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const { menuItemId, option } = parseCartKey(key);
        const menuItem = MENU.find((m) => m.id === menuItemId);
        if (!menuItem) return null;
        const unitPrice = resolvePrice(menuItem, option);
        return { ...menuItem, qty, selectedOption: option, unitPrice, cartKey: key };
      })
      .filter(Boolean);
  }

  function calcTotal(items) {
    return items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  }

  async function handleSubmit() {
    const items = getCartItems();
    if (items.length === 0) return;

    const orderItems = items.map((i) => ({
      id: i.id,
      name: i.name,
      emoji: i.emoji,
      qty: i.qty,
      price: i.unitPrice,
      option: i.selectedOption,
    }));

    const total = calcTotal(items);

    if (isEditing) {
      await updateOrder(editingOrder.id, {
        customerName: customerName.trim() || 'Walk-in',
        items: orderItems,
        total,
        paymentMethod: paymentMethod || 'cash',
        notes: notes.trim(),
      });
      setCart({});
      setCustomerName('');
      setNotes('');
      setPaymentMethod('cash');
      setShowCartDetails(false);
      onOrderPlaced({ id: editingOrder.id, updated: true });
    } else {
      const newOrderId = generateOrderId();
      const order = {
        id: newOrderId,
        createdBy: user,
        customerName: customerName.trim() || 'Walk-in',
        items: orderItems,
        total,
        paymentMethod: paymentMethod || 'cash',
        notes: notes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await addOrder(order);
      setCart({});
      setCustomerName('');
      setNotes('');
      setPaymentMethod('cash');
      setShowCartDetails(false);
      onOrderPlaced(order);
    }
  }

  function handleCancel() {
    setCart({});
    setCustomerName('');
    setNotes('');
    setPaymentMethod('cash');
    setShowCartDetails(false);
    onCancelEdit();
  }

  const cartItems = getCartItems();
  const total = calcTotal(cartItems);
  const totalCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const groups = getMenuGroups();
  const outCount = outOfStock.length;

  return (
    <div className="page" style={{ paddingBottom: totalCount > 0 ? '150px' : '5rem' }}>
      {isEditing && (
        <div className="edit-banner">
          <span>
            ✏️ Editing Order <strong>#{editingOrder.id}</strong>
          </span>
          <button className="cancel-edit-btn" onClick={handleCancel}>
            ✕ Cancel
          </button>
        </div>
      )}

      {/* Top Controls: Customer Input + Stock Manager trigger */}
      <div className="top-order-controls">
        <input
          type="text"
          className="customer-input"
          placeholder="Customer name (optional)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <button
          type="button"
          className={`stock-trigger-btn ${outCount > 0 ? 'has-oos' : ''}`}
          onClick={() => setShowStockManager(true)}
          title="Manage Out of Stock items"
        >
          📦 Stock {outCount > 0 ? `(${outCount} out)` : ''}
        </button>
      </div>

      {/* Optional Order Notes / Instructions */}
      <div className="order-notes-section">
        <input
          type="text"
          className="order-notes-input"
          placeholder="📝 Add instructions/notes (e.g. extra spicy, parcel)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="quick-chips-row">
          {QUICK_NOTE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="quick-chip"
              onClick={() => handleAddChip(chip)}
            >
              + {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Method Selector on page */}
      <div className="payment-method-card">
        <span className="payment-card-label">Payment Mode:</span>
        <div className="payment-toggle-buttons">
          <button
            type="button"
            className={`payment-toggle-btn ${paymentMethod === 'cash' ? 'active-cash' : ''}`}
            onClick={() => setPaymentMethod('cash')}
          >
            💵 Cash
          </button>
          <button
            type="button"
            className={`payment-toggle-btn ${paymentMethod === 'upi' ? 'active-upi' : ''}`}
            onClick={() => setPaymentMethod('upi')}
          >
            📱 UPI / Online
          </button>
        </div>
      </div>

      {/* ---- Menu grouped by category ---- */}
      {groups.map((group) => {
        const groupItems = MENU.filter((m) => m.group === group);
        return (
          <div key={group} className="menu-group">
            <h3 className="menu-group-header">{group}</h3>
            <div className="menu-grid">
              {groupItems.map((item) => {
                const itemOOS = isItemOutOfStock(item.id);

                // Total qty across all variants of this item in cart
                const totalQty = item.options
                  ? item.options.choices.reduce(
                      (s, c) => s + (cart[cartKey(item.id, c.name)] || 0),
                      0
                    )
                  : cart[cartKey(item.id, null)] || 0;

                return (
                  <div
                    key={item.id}
                    className={`menu-card ${totalQty > 0 ? 'selected' : ''} ${
                      itemOOS ? 'out-of-stock-card' : ''
                    }`}
                  >
                    {/* ---- Card header ---- */}
                    <div className="menu-card-header">
                      <div className="menu-item-name">
                        <span className="menu-item-emoji">{item.emoji}</span>
                        {item.name}
                        {item.desc && (
                          <span className="menu-item-desc">({item.desc})</span>
                        )}
                        <span
                          className={`menu-item-tag ${
                            item.category === 'veg' ? 'tag-veg' : 'tag-nonveg'
                          }`}
                        >
                          {item.category === 'veg' ? 'VEG' : 'NON-VEG'}
                        </span>
                        {itemOOS && (
                          <span className="oos-badge">⛔ OUT OF STOCK</span>
                        )}
                      </div>

                      {/* Show price + qty inline for items WITHOUT options */}
                      {!item.options && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="menu-item-price">₹{item.price}</span>

                          {itemOOS ? (
                            <div className="oos-action-box">
                              <span className="oos-label">Unavailable</span>
                              <button
                                type="button"
                                className="restock-mini-btn"
                                onClick={() => handleToggleStock(item.id)}
                                title="Click to make available"
                              >
                                🔄 Restock
                              </button>
                            </div>
                          ) : (
                            <div className="qty-control">
                              {(cart[item.id] || 0) > 0 && (
                                <>
                                  <button
                                    className="qty-btn"
                                    onClick={() => updateQty(item.id, null, -1)}
                                  >
                                    −
                                  </button>
                                  <span className="qty-value">{cart[item.id]}</span>
                                </>
                              )}
                              <button
                                className="qty-btn"
                                onClick={() => updateQty(item.id, null, 1)}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ---- Variant rows for items WITH options ---- */}
                    {item.options && (
                      <div className="variant-rows">
                        {itemOOS ? (
                          <div className="oos-variant-notice">
                            <span>Item currently out of stock</span>
                            <button
                              type="button"
                              className="restock-mini-btn"
                              onClick={() => handleToggleStock(item.id)}
                            >
                              🔄 Restock Item
                            </button>
                          </div>
                        ) : (
                          item.options.choices.map((choice) => {
                            const qty = cart[cartKey(item.id, choice.name)] || 0;
                            return (
                              <div key={choice.name} className="variant-row">
                                <span className="variant-label">{choice.name}</span>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                  }}
                                >
                                  <span className="variant-price">₹{choice.price}</span>
                                  <div className="qty-control">
                                    {qty > 0 && (
                                      <>
                                        <button
                                          className="qty-btn"
                                          onClick={() =>
                                            updateQty(item.id, choice.name, -1)
                                          }
                                        >
                                          −
                                        </button>
                                        <span className="qty-value">{qty}</span>
                                      </>
                                    )}
                                    <button
                                      className="qty-btn"
                                      onClick={() =>
                                        updateQty(item.id, choice.name, 1)
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ---- Inline Order Summary at page end ---- */}
      {cartItems.length > 0 && (
        <div className="order-summary">
          <h3>🧾 Order Summary</h3>
          {cartItems.map((item) => (
            <div key={item.cartKey} className="summary-item">
              <div>
                <div className="summary-item-name">
                  {item.emoji} {item.name} × {item.qty}
                </div>
                {item.selectedOption && (
                  <div className="summary-item-detail">{item.selectedOption}</div>
                )}
              </div>
              <span style={{ fontWeight: 600 }}>₹{item.unitPrice * item.qty}</span>
            </div>
          ))}

          {notes && (
            <div className="summary-notes-row">
              <span className="summary-notes-icon">📝</span>
              <span className="summary-notes-text">{notes}</span>
            </div>
          )}

          <div className="summary-payment-row">
            <span>Payment:</span>
            <strong>{paymentMethod === 'upi' ? '📱 UPI' : '💵 Cash'}</strong>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
          <button className="place-order-btn" onClick={handleSubmit}>
            {isEditing ? '💾 Update Order' : `✅ Place Order • ${paymentMethod === 'upi' ? '📱 UPI' : '💵 Cash'}`}
          </button>
        </div>
      )}

      {/* ---- Zomato-Style Sticky Bottom Cart Bar ---- */}
      {totalCount > 0 && (
        <>
          <div className="zomato-cart-bar">
            <div
              className="zomato-cart-info"
              onClick={() => setShowCartDetails((prev) => !prev)}
            >
              <div className="zomato-cart-items-count">
                {totalCount} {totalCount === 1 ? 'ITEM' : 'ITEMS'} •{' '}
                {paymentMethod === 'upi' ? '📱 UPI' : '💵 Cash'}
              </div>
              <div className="zomato-cart-total">
                ₹{total}
                <span className="zomato-cart-view-details">
                  {showCartDetails ? 'Hide details ▾' : 'View details ▴'}
                </span>
              </div>
            </div>

            <button className="zomato-place-btn" onClick={handleSubmit}>
              <span>{isEditing ? 'Update 💾' : 'Place Order ➔'}</span>
            </button>
          </div>

          {/* ---- Zomato-Style Slide-Up Cart Sheet ---- */}
          {showCartDetails && (
            <>
              <div
                className="zomato-sheet-backdrop"
                onClick={() => setShowCartDetails(false)}
              />
              <div className="zomato-sheet-content">
                <div className="zomato-sheet-header">
                  <div>
                    <h3 className="zomato-sheet-title">🧾 Review Order</h3>
                    <span className="zomato-sheet-subtitle">{totalCount} items in cart</span>
                  </div>
                  <button
                    className="zomato-sheet-close"
                    onClick={() => setShowCartDetails(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="zomato-sheet-customer">
                  <input
                    type="text"
                    className="customer-input"
                    placeholder="Customer name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                {/* Optional Comments / Notes inside sheet */}
                <div className="zomato-sheet-notes">
                  <input
                    type="text"
                    className="order-notes-input"
                    placeholder="📝 Order instructions / comments (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="quick-chips-row">
                    {QUICK_NOTE_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className="quick-chip"
                        onClick={() => handleAddChip(chip)}
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment selector inside slide-up review sheet */}
                <div className="zomato-sheet-payment">
                  <span className="payment-card-label">Payment Method:</span>
                  <div className="payment-toggle-buttons">
                    <button
                      type="button"
                      className={`payment-toggle-btn ${
                        paymentMethod === 'cash' ? 'active-cash' : ''
                      }`}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      className={`payment-toggle-btn ${
                        paymentMethod === 'upi' ? 'active-upi' : ''
                      }`}
                      onClick={() => setPaymentMethod('upi')}
                    >
                      📱 UPI / Online
                    </button>
                  </div>
                </div>

                <div className="zomato-sheet-items">
                  {cartItems.map((item) => (
                    <div key={item.cartKey} className="zomato-sheet-item">
                      <div className="zomato-sheet-item-info">
                        <span className="zomato-sheet-item-name">
                          {item.emoji} {item.name}
                        </span>
                        {item.selectedOption && (
                          <span className="zomato-sheet-item-option">
                            {item.selectedOption}
                          </span>
                        )}
                        <span className="zomato-sheet-item-price">
                          ₹{item.unitPrice} × {item.qty} ={' '}
                          <strong>₹{item.unitPrice * item.qty}</strong>
                        </span>
                      </div>

                      <div className="qty-control">
                        <button
                          className="qty-btn"
                          onClick={() => updateQty(item.id, item.selectedOption, -1)}
                        >
                          −
                        </button>
                        <span className="qty-value">{item.qty}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQty(item.id, item.selectedOption, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="zomato-sheet-total-row">
                  <span>Grand Total</span>
                  <span className="zomato-sheet-total-amount">₹{total}</span>
                </div>

                <button className="place-order-btn" onClick={handleSubmit}>
                  {isEditing
                    ? '💾 Update Order'
                    : `✅ Place Order • ₹${total} (${paymentMethod === 'upi' ? '📱 UPI' : '💵 Cash'})`}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Stock Manager Modal */}
      {showStockManager && (
        <StockManagerModal
          outOfStock={outOfStock}
          onToggleStock={handleToggleStock}
          onResetAllStock={handleResetAllStock}
          onClose={() => setShowStockManager(false)}
        />
      )}
    </div>
  );
}

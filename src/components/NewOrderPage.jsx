import { useState, useEffect } from 'react';
import { MENU, getMenuGroups } from '../data/menu';
import { addOrder, updateOrder, generateOrderId } from '../data/storage';

/*
  Cart shape (variant-based):
  {
    'veg-sandwich|||Without Cheese': 2,
    'veg-sandwich|||With Cheese': 1,
    'chicken-cutlets': 3,
  }
  Items WITH options  → key = "menuId|||choiceName"
  Items WITHOUT options → key = "menuId"
*/

function cartKey(menuItemId, option) {
  return option ? `${menuItemId}|||${option}` : menuItemId;
}

function parseCartKey(key) {
  const idx = key.indexOf('|||');
  if (idx === -1) return { menuItemId: key, option: null };
  return { menuItemId: key.slice(0, idx), option: key.slice(idx + 3) };
}

/** Resolve the unit price for a menu item + optional choice */
function resolvePrice(menuItem, optionName) {
  if (optionName && menuItem.options) {
    const choice = menuItem.options.choices.find((c) => c.name === optionName);
    if (choice) return choice.price;
  }
  return menuItem.price || 0;
}

export default function NewOrderPage({ user, onOrderPlaced, editingOrder, onCancelEdit }) {
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [showCartDetails, setShowCartDetails] = useState(false);

  const isEditing = !!editingOrder;

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
    }
  }, [editingOrder]);

  function updateQty(menuItemId, option, delta) {
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
      });
      setCart({});
      setCustomerName('');
      onOrderPlaced({ id: editingOrder.id, updated: true });
    } else {
      const newOrderId = generateOrderId();
      const order = {
        id: newOrderId,
        createdBy: user,
        customerName: customerName.trim() || 'Walk-in',
        items: orderItems,
        total,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await addOrder(order);
      setCart({});
      setCustomerName('');
      onOrderPlaced(order);
    }
  }

  function handleCancel() {
    setCart({});
    setCustomerName('');
    onCancelEdit();
  }

  const cartItems = getCartItems();
  const total = calcTotal(cartItems);
  const totalCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const groups = getMenuGroups();

  return (
    <div className="page" style={{ paddingBottom: totalCount > 0 ? '140px' : '5rem' }}>
      {isEditing && (
        <div className="edit-banner">
          <span>✏️ Editing Order <strong>#{editingOrder.id}</strong></span>
          <button className="cancel-edit-btn" onClick={handleCancel}>
            ✕ Cancel
          </button>
        </div>
      )}

      <input
        type="text"
        className="customer-input"
        placeholder="Customer name (optional)"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />

      {/* ---- Menu grouped by category ---- */}
      {groups.map((group) => {
        const groupItems = MENU.filter((m) => m.group === group);
        return (
          <div key={group} className="menu-group">
            <h3 className="menu-group-header">{group}</h3>
            <div className="menu-grid">
              {groupItems.map((item) => {
                // Total qty across all variants of this item
                const totalQty = item.options
                  ? item.options.choices.reduce(
                      (s, c) => s + (cart[cartKey(item.id, c.name)] || 0),
                      0
                    )
                  : cart[cartKey(item.id, null)] || 0;

                return (
                  <div
                    key={item.id}
                    className={`menu-card ${totalQty > 0 ? 'selected' : ''}`}
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
                      </div>

                      {/* Show price + qty inline for items WITHOUT options */}
                      {!item.options && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="menu-item-price">₹{item.price}</span>
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
                        </div>
                      )}
                    </div>

                    {/* ---- Variant rows for items WITH options ---- */}
                    {item.options && (
                      <div className="variant-rows">
                        {item.options.choices.map((choice) => {
                          const qty = cart[cartKey(item.id, choice.name)] || 0;
                          return (
                            <div key={choice.name} className="variant-row">
                              <span className="variant-label">{choice.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                        })}
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
                  <div className="summary-item-detail">
                    {item.selectedOption}
                  </div>
                )}
              </div>
              <span style={{ fontWeight: 600 }}>₹{item.unitPrice * item.qty}</span>
            </div>
          ))}
          <div className="summary-total">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
          <button className="place-order-btn" onClick={handleSubmit}>
            {isEditing ? '💾 Update Order' : '✅ Place Order'}
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
                {totalCount} {totalCount === 1 ? 'ITEM' : 'ITEMS'}
              </div>
              <div className="zomato-cart-total">
                ₹{total}
                <span className="zomato-cart-view-details">
                  {showCartDetails ? 'Hide details ▾' : 'View details ▴'}
                </span>
              </div>
            </div>

            <button
              className="zomato-place-btn"
              onClick={handleSubmit}
            >
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
                          ₹{item.unitPrice} × {item.qty} = <strong>₹{item.unitPrice * item.qty}</strong>
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
                  {isEditing ? '💾 Update Order' : '✅ Place Order • ₹' + total}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

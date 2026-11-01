import { useState } from 'react';
import { MENU, getMenuGroups } from '../data/menu';

export default function StockManagerModal({
  outOfStock = [],
  onToggleStock,
  onResetAllStock,
  onClose,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const groups = getMenuGroups();

  function isOutOfStock(key) {
    return outOfStock.includes(key);
  }

  const outOfStockCount = outOfStock.length;

  return (
    <div className="stock-modal-backdrop" onClick={onClose}>
      <div className="stock-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="stock-modal-header">
          <div>
            <h3 className="stock-modal-title">📦 Manage Stock</h3>
            <span className="stock-modal-subtitle">
              {outOfStockCount === 0
                ? 'All items are currently In Stock'
                : `${outOfStockCount} item${outOfStockCount > 1 ? 's' : ''} marked Out of Stock`}
            </span>
          </div>
          <button className="stock-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Search bar */}
        <div className="stock-modal-search">
          <input
            type="text"
            className="stock-search-input"
            placeholder="🔍 Search items to update stock..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="stock-search-clear"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Action bar */}
        {outOfStockCount > 0 && (
          <div className="stock-modal-actions">
            <button
              type="button"
              className="stock-reset-all-btn"
              onClick={() => {
                if (window.confirm('Mark ALL menu items as In Stock?')) {
                  onResetAllStock();
                }
              }}
            >
              🔄 Restock Everything ({outOfStockCount})
            </button>
          </div>
        )}

        {/* List of categories and items */}
        <div className="stock-modal-body">
          {groups.map((group) => {
            const groupItems = MENU.filter((m) => m.group === group).filter(
              (m) =>
                !searchTerm ||
                m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (groupItems.length === 0) return null;

            return (
              <div key={group} className="stock-group-section">
                <div className="stock-group-title">{group}</div>
                <div className="stock-items-list">
                  {groupItems.map((item) => {
                    const itemOOS = isOutOfStock(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`stock-item-row ${itemOOS ? 'is-out' : ''}`}
                      >
                        <div className="stock-item-info">
                          <span className="stock-item-emoji">{item.emoji}</span>
                          <div>
                            <span className="stock-item-name">{item.name}</span>
                            {item.desc && (
                              <span className="stock-item-desc"> ({item.desc})</span>
                            )}
                            <span
                              className={`stock-item-tag ${
                                item.category === 'veg' ? 'tag-veg' : 'tag-nonveg'
                              }`}
                            >
                              {item.category === 'veg' ? 'VEG' : 'NON-VEG'}
                            </span>
                          </div>
                        </div>

                        {/* Toggle button */}
                        <button
                          type="button"
                          className={`stock-toggle-pill ${itemOOS ? 'pill-out' : 'pill-in'}`}
                          onClick={() => onToggleStock(item.id)}
                        >
                          {itemOOS ? '🔴 Out of Stock' : '🟢 In Stock'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="stock-modal-footer">
          <button className="stock-done-btn" onClick={onClose}>
            ✓ Done
          </button>
        </div>
      </div>
    </div>
  );
}

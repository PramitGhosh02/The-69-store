import { useState, useEffect, useMemo, useRef } from 'react';
import {
  loadOrders,
  exportOrdersCSV,
  exportOrdersJSON,
  downloadCSV,
  downloadJSON,
  clearAllOrders,
  importOrdersJSON,
  cloudDatabaseEnabled,
  activeSupabaseUrl,
  saveSupabaseConfig,
} from '../data/storage';
import { TEAM_MEMBERS } from '../data/menu';

export default function DashboardPage({ refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All'); // 'All' | 'cash' | 'upi'
  const fileInputRef = useRef(null);
  const [importMode, setImportMode] = useState('merge');
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(activeSupabaseUrl || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState('');

  useEffect(() => {
    let active = true;
    loadOrders()
      .then((loadedOrders) => {
        if (active) setOrders(loadedOrders);
      })
      .catch((error) => window.alert(error.message || 'Could not load orders.'));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Date-filtered orders (basis for total financial tally)
  const dateFilteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }, [orders, dateFrom, dateTo]);

  // Overall Financial Breakdown (Cash vs UPI across all orders in date range)
  const financialTally = useMemo(() => {
    let cashCount = 0;
    let cashSum = 0;
    let upiCount = 0;
    let upiSum = 0;

    dateFilteredOrders.forEach((o) => {
      const isUpi = o.paymentMethod === 'upi';
      const amt = o.total || 0;
      if (isUpi) {
        upiCount++;
        upiSum += amt;
      } else {
        cashCount++;
        cashSum += amt;
      }
    });

    const totalSum = cashSum + upiSum;
    const cashPercent = totalSum > 0 ? Math.round((cashSum / totalSum) * 100) : 50;
    const upiPercent = totalSum > 0 ? 100 - cashPercent : 50;

    return {
      totalSum,
      cashCount,
      cashSum,
      upiCount,
      upiSum,
      cashPercent,
      upiPercent,
    };
  }, [dateFilteredOrders]);

  // Filtered by both Date AND Payment Method (for drilling down into details)
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter((o) => {
      if (paymentFilter === 'All') return true;
      const isUpi = o.paymentMethod === 'upi';
      return paymentFilter === 'upi' ? isUpi : !isUpi;
    });
  }, [dateFilteredOrders, paymentFilter]);

  // Stats
  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalItems = filteredOrders.reduce(
    (s, o) => s + o.items.reduce((a, i) => a + i.qty, 0),
    0
  );

  // Items breakdown
  const itemCounts = useMemo(() => {
    const counts = {};
    filteredOrders.forEach((o) =>
      o.items.forEach((item) => {
        const label = item.option ? `${item.name} (${item.option})` : item.name;
        counts[label] = (counts[label] || 0) + item.qty;
      })
    );
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [filteredOrders]);

  const maxCount = itemCounts.length > 0 ? itemCounts[0][1] : 1;

  // Per-team stats
  const teamStats = useMemo(() => {
    const stats = {};
    TEAM_MEMBERS.forEach((m) => (stats[m] = { orders: 0, revenue: 0, cash: 0, upi: 0 }));
    filteredOrders.forEach((o) => {
      if (stats[o.createdBy]) {
        stats[o.createdBy].orders += 1;
        stats[o.createdBy].revenue += o.total || 0;
        if (o.paymentMethod === 'upi') {
          stats[o.createdBy].upi += o.total || 0;
        } else {
          stats[o.createdBy].cash += o.total || 0;
        }
      }
    });
    return stats;
  }, [filteredOrders]);

  // Unique customers
  const uniqueCustomers = useMemo(() => {
    const set = new Set();
    filteredOrders.forEach((o) => {
      if (o.customerName && o.customerName !== 'Walk-in') {
        set.add(o.customerName.toLowerCase());
      }
    });
    return set.size;
  }, [filteredOrders]);

  function handleExportCSV() {
    const csv = exportOrdersCSV(orders);
    if (!csv) {
      alert('No orders to export.');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `the69store_orders_${date}.csv`);
  }

  function handleExportJSON() {
    if (orders.length === 0) {
      window.alert('No orders to back up.');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadJSON(exportOrdersJSON(orders), `the69store_backup_${date}.json`);
  }

  function startImport(mode) {
    setImportMode(mode);
    fileInputRef.current?.click();
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (
      importMode === 'replace' &&
      !window.confirm(
        'Replace the full order database with this backup? This cannot be undone.'
      )
    )
      return;
    try {
      const updated = await importOrdersJSON(await file.text(), importMode);
      setOrders(updated);
      window.alert(
        `${updated.length} orders ${importMode === 'merge' ? 'merged' : 'restored'}.`
      );
    } catch (error) {
      window.alert(error.message || 'Could not import this backup.');
    }
  }

  async function handleClearAll() {
    if (
      window.confirm('⚠️ This will permanently delete ALL orders. Are you sure?')
    ) {
      if (window.confirm('Really? This cannot be undone.')) {
        try {
          await clearAllOrders();
          setOrders([]);
        } catch (error) {
          window.alert(error.message || 'Could not clear the order database.');
        }
      }
    }
  }

  return (
    <div className="page">
      <h2 className="section-title">📊 Dashboard & Finances</h2>

      {/* Date Filters */}
      <div className="date-filter">
        <input
          type="date"
          className="date-input"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>→</span>
        <input
          type="date"
          className="date-input"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        {(dateFrom || dateTo) && (
          <button
            className="clear-filter-btn"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* 💰 Financial Tally Card (Cash vs UPI)                           */}
      {/* ============================================================== */}
      <div className="finance-tally-card">
        <div className="finance-tally-header">
          <div>
            <h3 className="finance-tally-title">💰 Financial Tally</h3>
            <span className="finance-tally-subtitle">
              Total Revenue: <strong>₹{financialTally.totalSum}</strong> ({dateFilteredOrders.length} orders)
            </span>
          </div>
        </div>

        {/* Cash vs UPI Cards */}
        <div className="finance-split-grid">
          <div className="finance-split-box box-cash">
            <div className="finance-box-top">
              <span className="finance-box-badge badge-cash">💵 Physical Cash</span>
              <span className="finance-box-count">{financialTally.cashCount} orders</span>
            </div>
            <div className="finance-box-amount">₹{financialTally.cashSum}</div>
            <div className="finance-box-caption">To tally in cash box</div>
          </div>

          <div className="finance-split-box box-upi">
            <div className="finance-box-top">
              <span className="finance-box-badge badge-upi">📱 UPI / Bank</span>
              <span className="finance-box-count">{financialTally.upiCount} orders</span>
            </div>
            <div className="finance-box-amount">₹{financialTally.upiSum}</div>
            <div className="finance-box-caption">To tally in UPI / GPay</div>
          </div>
        </div>

        {/* Visual Progress Bar Ratio */}
        {financialTally.totalSum > 0 && (
          <div className="finance-ratio-wrap">
            <div className="finance-ratio-bar">
              <div
                className="finance-bar-segment segment-cash"
                style={{ width: `${financialTally.cashPercent}%` }}
                title={`Cash: ${financialTally.cashPercent}%`}
              />
              <div
                className="finance-bar-segment segment-upi"
                style={{ width: `${financialTally.upiPercent}%` }}
                title={`UPI: ${financialTally.upiPercent}%`}
              />
            </div>
            <div className="finance-ratio-labels">
              <span>💵 Cash: {financialTally.cashPercent}%</span>
              <span>📱 UPI: {financialTally.upiPercent}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Drill-Down Filter */}
      <div className="dashboard-filter-section">
        <span className="filter-label">Filter Analytics by Mode:</span>
        <div className="dashboard-filter-pills">
          <button
            className={`dash-filter-pill ${paymentFilter === 'All' ? 'active' : ''}`}
            onClick={() => setPaymentFilter('All')}
          >
            All ({dateFilteredOrders.length})
          </button>
          <button
            className={`dash-filter-pill ${paymentFilter === 'cash' ? 'active-cash' : ''}`}
            onClick={() => setPaymentFilter('cash')}
          >
            💵 Cash Only ({financialTally.cashCount})
          </button>
          <button
            className={`dash-filter-pill ${paymentFilter === 'upi' ? 'active-upi' : ''}`}
            onClick={() => setPaymentFilter('upi')}
          >
            📱 UPI Only ({financialTally.upiCount})
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🧾</div>
          <div className="stat-value">{totalOrders}</div>
          <div className="stat-label">Orders ({paymentFilter})</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">
            {totalRevenue > 0 ? `₹${totalRevenue}` : '--'}
          </div>
          <div className="stat-label">Revenue ({paymentFilter})</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🍽️</div>
          <div className="stat-value">{totalItems}</div>
          <div className="stat-label">Items Sold</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{uniqueCustomers}</div>
          <div className="stat-label">Customers</div>
        </div>
      </div>

      {/* Item Popularity Chart */}
      <div className="chart-card">
        <h3>🏆 Most Popular Items {paymentFilter !== 'All' ? `(${paymentFilter.toUpperCase()})` : ''}</h3>
        {itemCounts.length === 0 ? (
          <div className="empty-state" style={{ padding: '1rem' }}>
            <div className="empty-text">No data yet</div>
          </div>
        ) : (
          <div className="bar-chart">
            {itemCounts.map(([name, count]) => (
              <div key={name} className="bar-row">
                <span className="bar-label">{name}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.max((count / maxCount) * 100, 12)}%`,
                    }}
                  >
                    <span className="bar-value">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Performance */}
      <div className="chart-card">
        <h3>👨‍🍳 Team Performance</h3>
        <div className="team-stats">
          {TEAM_MEMBERS.map((name) => (
            <div key={name} className="team-card">
              <div className="team-name">{name}</div>
              <div className="team-orders">{teamStats[name]?.orders || 0}</div>
              <div className="team-label">orders</div>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#FF6B35',
                  marginTop: '0.25rem',
                }}
              >
                {teamStats[name]?.revenue > 0 ? `₹${teamStats[name].revenue}` : '₹ --'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: '0.2rem' }}>
                💵 ₹{teamStats[name]?.cash || 0} • 📱 ₹{teamStats[name]?.upi || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cloud Sync & Multi-Device Settings */}
      <div className="chart-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <h3>🌐 Live Multi-Device Sync</h3>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              backgroundColor: cloudDatabaseEnabled ? '#D1FAE5' : '#F3F4F6',
              color: cloudDatabaseEnabled ? '#065F46' : '#6B7280',
            }}
          >
            {cloudDatabaseEnabled ? '● Live Sync Active' : '○ Local Storage'}
          </span>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.75rem' }}>
          {cloudDatabaseEnabled
            ? 'Connected to Supabase! Orders & stock status sync across all phones in real-time.'
            : 'Currently in local mode. Connect a free Supabase project so Pramit, Sohana, and Sumedh can all see live orders on their own phones.'}
        </p>

        {cloudDatabaseEnabled ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 600 }}>
              Connected: {activeSupabaseUrl}
            </span>
            <button
              className="clear-filter-btn"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
              onClick={() => {
                if (
                  window.confirm(
                    'Disconnect from Supabase? Orders will revert to local device storage.'
                  )
                ) {
                  saveSupabaseConfig('', '');
                }
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <button
              className="clear-filter-btn"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}
              onClick={() => setShowCloudConfig(!showCloudConfig)}
            >
              {showCloudConfig ? '▲ Hide Connection Setup' : '▼ Connect Supabase Project'}
            </button>

            {showCloudConfig && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  <label
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Project URL
                  </label>
                  <input
                    type="text"
                    className="customer-input"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  />
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <label
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Anon Public API Key
                  </label>
                  <input
                    type="password"
                    className="customer-input"
                    placeholder="eyJhbGciOi..."
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  />
                </div>

                <button
                  className="login-btn"
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    if (!supabaseUrlInput.trim() || !supabaseKeyInput.trim()) {
                      alert('Please provide both Project URL and Anon Key.');
                      return;
                    }
                    saveSupabaseConfig(supabaseUrlInput, supabaseKeyInput);
                  }}
                >
                  Save & Connect Live Sync
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export / Backup / Restore */}
      <div className="chart-card">
        <h3>💾 Data Backup & Restore</h3>
        <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.75rem' }}>
          Export includes payment mode (Cash/UPI) and customer notes for excel tallying.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="export-btn" onClick={handleExportCSV}>
            📥 Export Orders to CSV (Excel)
          </button>
          <button className="export-btn" onClick={handleExportJSON}>
            💾 Save Full Backup (JSON)
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              className="export-btn"
              style={{ backgroundColor: '#4F46E5' }}
              onClick={() => startImport('merge')}
            >
              🔄 Merge Backup
            </button>
            <button
              className="export-btn"
              style={{ backgroundColor: '#059669' }}
              onClick={() => startImport('replace')}
            >
              ♻️ Restore Backup
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json,application/json"
            onChange={handleImportFile}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="danger-zone">
        <h3>⚠️ Danger Zone</h3>
        <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.5rem' }}>
          Clear the entire order database. (Stock settings are preserved).
        </p>
        <button className="clear-btn" onClick={handleClearAll}>
          🗑️ Clear All Orders
        </button>
      </div>
    </div>
  );
}

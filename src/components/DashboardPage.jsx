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
    return () => { active = false; };
  }, [refreshKey]);

  const filteredOrders = useMemo(() => {
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
    TEAM_MEMBERS.forEach((m) => (stats[m] = { orders: 0, revenue: 0 }));
    filteredOrders.forEach((o) => {
      if (stats[o.createdBy]) {
        stats[o.createdBy].orders += 1;
        stats[o.createdBy].revenue += o.total || 0;
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
    if (importMode === 'replace' && !window.confirm('Replace the full order database with this backup? This cannot be undone.')) return;
    try {
      const updated = await importOrdersJSON(await file.text(), importMode);
      setOrders(updated);
      window.alert(`${updated.length} orders ${importMode === 'merge' ? 'merged' : 'restored'}.`);
    } catch (error) {
      window.alert(error.message || 'Could not import this backup.');
    }
  }

  async function handleClearAll() {
    if (
      window.confirm(
        '⚠️ This will permanently delete ALL orders. Are you sure?'
      )
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
      <h2 className="section-title">📊 Dashboard</h2>

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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🧾</div>
          <div className="stat-value">{totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">
            {totalRevenue > 0 ? `₹${totalRevenue}` : '--'}
          </div>
          <div className="stat-label">Revenue</div>
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
        <h3>🏆 Most Popular Items</h3>
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
              <div className="team-orders">
                {teamStats[name]?.orders || 0}
              </div>
              <div className="team-label">orders</div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#FF6B35',
                  marginTop: '0.25rem',
                }}
              >
                {teamStats[name]?.revenue > 0
                  ? `₹${teamStats[name].revenue}`
                  : '₹ --'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cloud Sync & Multi-Device Settings */}
      <div className="chart-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
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
            ? 'Connected to Supabase! Orders sync across all phones in real-time without refreshing.'
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
                if (window.confirm('Disconnect from Supabase? Orders will revert to local device storage.')) {
                  saveSupabaseConfig('', '');
                }
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            {!showCloudConfig ? (
              <button
                className="place-order-btn"
                style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', marginTop: '0.25rem' }}
                onClick={() => setShowCloudConfig(true)}
              >
                ⚡ Connect Supabase for Live Sync
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!supabaseUrlInput.trim() || !supabaseKeyInput.trim()) {
                    alert('Please enter both the Supabase URL and Anon Key.');
                    return;
                  }
                  saveSupabaseConfig(supabaseUrlInput, supabaseKeyInput);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '12px',
                }}
              >
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)' }}>
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  className="customer-input"
                  style={{ marginBottom: 0, padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  required
                />

                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)', marginTop: '0.25rem' }}>
                  Supabase Anon Key (Public)
                </label>
                <input
                  type="password"
                  className="customer-input"
                  style={{ marginBottom: 0, padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  required
                />

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="place-order-btn"
                    style={{ margin: 0, padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                  >
                    💾 Save & Connect
                  </button>
                  <button
                    type="button"
                    className="clear-filter-btn"
                    style={{ padding: '0.6rem 1rem' }}
                    onClick={() => setShowCloudConfig(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="chart-card">
        <h3>🗄️ Data Management</h3>
        <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.75rem' }}>
          Orders are stored permanently in the database until manually deleted. Export CSV for spreadsheets or download JSON backups to preserve your sales history.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
        <div className="data-actions">
          <button className="data-btn export-btn" onClick={handleExportCSV}>
            📥 Export Orders (CSV)
          </button>
          <button className="data-btn export-btn" onClick={handleExportJSON}>
            🗃️ Download JSON Backup
          </button>
          <button className="data-btn export-btn" onClick={() => startImport('merge')}>
            ➕ Merge JSON Backup
          </button>
          <button className="data-btn export-btn" onClick={() => startImport('replace')}>
            ♻️ Replace with Backup
          </button>
          <button className="data-btn danger-btn" onClick={handleClearAll}>
            🗑️ Clear All Orders
          </button>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
          Total records: {orders.length}
        </div>
      </div>
    </div>
  );
}

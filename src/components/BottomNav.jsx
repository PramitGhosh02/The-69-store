export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'new-order', icon: '➕', label: 'New Order' },
    { id: 'orders', icon: '📋', label: 'Orders' },
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

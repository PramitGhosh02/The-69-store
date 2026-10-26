import { useState, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import NewOrderPage from './components/NewOrderPage';
import OrdersPage from './components/OrdersPage';
import DashboardPage from './components/DashboardPage';
import { clearStoredSession, cloudDatabaseEnabled, getStoredSession } from './data/storage';
import './index.css';

function App() {
  const [user, setUser] = useState(() => {
    if (cloudDatabaseEnabled) {
      return getStoredSession()?.user?.user_metadata?.member_name || null;
    }
    return localStorage.getItem('the69store_user') || null;
  });
  const [activeTab, setActiveTab] = useState('new-order');
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  function handleLogin(name, authSession = null) {
    setUser(name);
    if (!authSession) localStorage.setItem('the69store_user', name);
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem('the69store_user');
    clearStoredSession();
    setActiveTab('new-order');
    setEditingOrder(null);
  }

  const handleOrderPlaced = useCallback((order) => {
    setRefreshKey((k) => k + 1);
    setEditingOrder(null);
    if (order.updated) {
      setToast({ message: `💾 Order #${order.id} updated!` });
    } else {
      setToast({ message: `✅ Order #${order.id} placed!`, order });
    }
    setTimeout(() => setToast(null), 5000);
    setActiveTab('orders');
  }, []);

  function handleEditOrder(order) {
    setToast(null);
    setEditingOrder(order);
    setActiveTab('new-order');
  }

  function handleCancelEdit() {
    setEditingOrder(null);
    setActiveTab('orders');
  }

  const handleOrderDeleted = useCallback((orderId) => {
    setRefreshKey((k) => k + 1);
    setToast({ message: `🗑️ Order #${orderId} deleted permanently.` });
    setTimeout(() => setToast(null), 3000);
  }, []);

  function handleTabChange(tab) {
    // If leaving new-order while editing, warn
    if (activeTab === 'new-order' && editingOrder && tab !== 'new-order') {
      if (!window.confirm('Discard edit and switch tabs?')) return;
      setEditingOrder(null);
    }
    setActiveTab(tab);
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <>
      <Header user={user} onLogout={handleLogout} />

      {activeTab === 'new-order' && (
        <NewOrderPage
          user={user}
          onOrderPlaced={handleOrderPlaced}
          editingOrder={editingOrder}
          onCancelEdit={handleCancelEdit}
        />
      )}
      {activeTab === 'orders' && (
        <OrdersPage
          refreshKey={refreshKey}
          onEditOrder={handleEditOrder}
          onOrderDeleted={handleOrderDeleted}
        />
      )}
      {activeTab === 'dashboard' && <DashboardPage refreshKey={refreshKey} />}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {toast && (
        <div className="toast">
          <span>{toast.message}</span>
          {toast.order && (
            <button className="toast-edit-btn" onClick={() => handleEditOrder(toast.order)}>
              ✏️ Edit this order
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default App;

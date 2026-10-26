export default function Header({ user, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <span className="header-logo">🍔</span>
        <span className="header-title">The 69 Store</span>
      </div>
      <div className="header-user">
        <div className="header-user-avatar">{user[0]}</div>
        <span>{user}</span>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

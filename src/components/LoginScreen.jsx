import { TEAM_MEMBERS } from '../data/menu';

export default function LoginScreen({ onLogin }) {
  return (
    <div className="login-screen">
      <div className="login-logo">🍔</div>
      <h1 className="login-title">The 69 Store</h1>
      <p className="login-subtitle">Food Stall Order Manager</p>

      <p className="login-prompt">Select profile</p>
      <div className="login-buttons">
        {TEAM_MEMBERS.map((name) => (
          <button
            key={name}
            className="login-btn"
            onClick={() => onLogin(name)}
          >
            <div className="login-avatar">{name[0]}</div>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

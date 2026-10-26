import { useState } from 'react';
import { TEAM_MEMBERS } from '../data/menu';
import { clearStoredSession, cloudDatabaseEnabled, signIn } from '../data/storage';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCloudLogin(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await signIn(email.trim(), password);
      const memberName = session.user?.user_metadata?.member_name;
      if (!TEAM_MEMBERS.includes(memberName)) {
        throw new Error('This account is missing a valid team member name. Ask the app administrator to set its member_name.');
      }
      onLogin(memberName, session);
    } catch (err) {
      clearStoredSession();
      setError(err.message || 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-logo">🍔</div>
      <h1 className="login-title">The 69 Store</h1>
      <p className="login-subtitle">Food Stall Order Manager</p>
      {cloudDatabaseEnabled ? (
        <form className="cloud-login-form" onSubmit={handleCloudLogin}>
          <p className="login-prompt">Team sign in</p>
          <input
            type="email"
            autoComplete="username"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit-btn" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in securely'}
          </button>
        </form>
      ) : (
        <>
          <p className="login-prompt">Sign in as</p>
          <p className="login-mode-note">Local preview: orders are stored in this browser only.</p>
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
        </>
      )}
    </div>
  );
}

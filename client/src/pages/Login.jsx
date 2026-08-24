import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@shop.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/shop');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(credential) {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential);
      navigate('/shop');
    } catch (err) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Welcome back</h1>
      <p className="muted">Log in to shop and track orders.</p>
      {error && <div className="error">{error}</div>}

      <div className={googleLoading ? 'is-loading' : ''}>
        <GoogleAuthButton text="signin_with" onCredential={handleGoogleCredential} onError={setError} />
      </div>

      <div className="auth-divider">
        <span>or continue with email</span>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Log in'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: '1rem' }}>
        No account? <Link to="/register">Register</Link>
      </p>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Demo: demo@shop.com / password123
      </p>
    </div>
  );
}

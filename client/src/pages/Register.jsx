import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
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
      <h1>Create account</h1>
      <p className="muted">Join FORMA to save your cart and place orders.</p>
      {error && <div className="error">{error}</div>}

      <div className={googleLoading ? 'is-loading' : ''}>
        <GoogleAuthButton text="signup_with" onCredential={handleGoogleCredential} onError={setError} />
      </div>

      <div className="auth-divider">
        <span>or sign up with email</span>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Full name
          <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Register'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: '1rem' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

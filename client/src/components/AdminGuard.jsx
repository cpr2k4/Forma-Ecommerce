import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="empty">Checking access…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="container section" style={{ paddingTop: '3rem' }}>
        <h1 className="page-title">Access denied</h1>
        <p className="muted">This console is restricted to store administrators.</p>
      </div>
    );
  }

  return children;
}

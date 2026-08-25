import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="page-title">Overview</h1>
      <p className="muted">Live catalog and fulfillment snapshot.</p>
      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="empty">Loading…</div>
      ) : stats ? (
        <div className="admin-stats">
          <article className="admin-stat">
            <span className="muted">Products</span>
            <strong>{stats.products}</strong>
          </article>
          <article className="admin-stat">
            <span className="muted">SKUs</span>
            <strong>{stats.variants}</strong>
          </article>
          <article className="admin-stat">
            <span className="muted">Low stock</span>
            <strong>{stats.lowStock}</strong>
          </article>
          <article className="admin-stat warn">
            <span className="muted">Out of stock</span>
            <strong>{stats.outOfStock}</strong>
          </article>
        </div>
      ) : null}

      <div className="admin-actions">
        <Link className="btn btn-primary" to="/admin/products/new">
          New product
        </Link>
        <Link className="btn btn-ghost" to="/admin/inventory">
          Adjust stock
        </Link>
        <Link className="btn btn-ghost" to="/admin/orders">
          Orders {stats ? `(${stats.orders})` : ''}
        </Link>
      </div>
    </div>
  );
}

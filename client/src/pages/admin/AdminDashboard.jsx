import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProducts()
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const variants = products.flatMap((p) => p.variants || []);
    const lowStock = variants.filter((v) => v.stockQty > 0 && v.stockQty <= 8).length;
    const out = variants.filter((v) => !v.inStock || v.stockQty === 0).length;
    return {
      products: products.length,
      variants: variants.length,
      lowStock,
      out,
    };
  }, [products]);

  return (
    <div>
      <h1 className="page-title">Overview</h1>
      <p className="muted">Live catalog snapshot. Writes land when admin APIs are wired.</p>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
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
            <strong>{stats.out}</strong>
          </article>
        </div>
      )}

      <div className="admin-actions">
        <Link className="btn btn-primary" to="/admin/products/new">
          New product
        </Link>
        <Link className="btn btn-ghost" to="/admin/inventory">
          Adjust stock
        </Link>
        <Link className="btn btn-ghost" to="/admin/orders">
          Orders
        </Link>
      </div>
    </div>
  );
}

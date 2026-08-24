import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .getProducts()
      .then((data) => setProducts(data.products || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const hay = `${p.name} ${p.brand} ${p.slug}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="muted">Create, edit, publish, and remove catalog items.</p>
        </div>
        <Link className="btn btn-primary" to="/admin/products/new">
          New product
        </Link>
      </div>

      <div className="filters">
        <input
          placeholder="Filter by name, brand, slug…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="empty">Loading products…</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>SKUs</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-product-cell">
                      {p.imageUrl && <img src={p.imageUrl} alt="" />}
                      <div>
                        <strong>{p.name}</strong>
                        <div className="muted">{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.category?.name || '—'}</td>
                  <td>{p.price?.formatted}</td>
                  <td>{p.variants?.length || 0}</td>
                  <td>
                    <span className="badge">Live</span>
                  </td>
                  <td className="admin-row-actions">
                    <Link className="btn btn-ghost" to={`/admin/products/${p.id}/edit`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty">No products in this filter.</div>}
        </div>
      )}
    </div>
  );
}

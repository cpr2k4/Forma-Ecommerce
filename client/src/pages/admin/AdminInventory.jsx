import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api
      .getProducts()
      .then((data) => {
        const list = data.products || [];
        setProducts(list);
        const next = {};
        list.forEach((p) => {
          (p.variants || []).forEach((v) => {
            next[v.id] = String(v.stockQty ?? 0);
          });
        });
        setStock(next);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.flatMap((p) =>
      (p.variants || [])
        .map((v) => ({
          product: p,
          variant: v,
        }))
        .filter(({ product, variant }) => {
          if (!needle) return true;
          const hay = `${product.name} ${variant.sku} ${JSON.stringify(variant.attrs)}`.toLowerCase();
          return hay.includes(needle);
        })
    );
  }, [products, q]);

  function saveRow(variantId) {
    setNotice(`UI only — stock for this SKU would update to ${stock[variantId]}.`);
  }

  return (
    <div>
      <h1 className="page-title">Inventory</h1>
      <p className="muted">Adjust variant stock. Saves will connect to admin APIs next.</p>
      {notice && <div className="success">{notice}</div>}

      <div className="filters">
        <input
          placeholder="Filter by product or SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty">Loading inventory…</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Variant</th>
                <th>On hand</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ product, variant }) => {
                const qty = Number(stock[variant.id] ?? 0);
                const tone = qty === 0 ? 'warn' : qty <= 8 ? 'low' : '';
                return (
                  <tr key={variant.id} className={tone ? `row-${tone}` : ''}>
                    <td>{product.name}</td>
                    <td>{variant.sku}</td>
                    <td className="muted">
                      {Object.entries(variant.attrs || {})
                        .map(([k, val]) => `${k}: ${val}`)
                        .join(' · ') || '—'}
                    </td>
                    <td>
                      <input
                        className="admin-stock-input"
                        type="number"
                        min="0"
                        value={stock[variant.id] ?? '0'}
                        onChange={(e) =>
                          setStock((prev) => ({ ...prev, [variant.id]: e.target.value }))
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => saveRow(variant.id)}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div className="empty">No SKUs match.</div>}
        </div>
      )}
    </div>
  );
}

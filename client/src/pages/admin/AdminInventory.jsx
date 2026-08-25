import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    api
      .adminInventory()
      .then((data) => {
        const list = data.items || [];
        setItems(list);
        const next = {};
        list.forEach((item) => {
          next[item.id] = String(item.stockQty ?? 0);
        });
        setStock(next);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((item) => {
      if (!needle) return true;
      const hay = `${item.product.name} ${item.sku} ${JSON.stringify(item.attrs)}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q]);

  async function saveRow(variantId) {
    setNotice('');
    setError('');
    setSavingId(variantId);
    try {
      const data = await api.adminUpdateStock(variantId, {
        stockQty: Number(stock[variantId]),
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === variantId ? { ...item, stockQty: data.item.stockQty } : item
        )
      );
      setNotice(`Updated ${data.item.sku} → ${data.item.stockQty}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h1 className="page-title">Inventory</h1>
      <p className="muted">Adjust variant stock and save per SKU.</p>
      {notice && <div className="success">{notice}</div>}
      {error && <div className="error">{error}</div>}

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
              {rows.map((item) => {
                const qty = Number(stock[item.id] ?? 0);
                const tone = qty === 0 ? 'warn' : qty <= 8 ? 'low' : '';
                return (
                  <tr key={item.id} className={tone ? `row-${tone}` : ''}>
                    <td>
                      {item.product.name}
                      {!item.product.isPublished && (
                        <div className="muted" style={{ fontSize: '0.78rem' }}>
                          Hidden
                        </div>
                      )}
                    </td>
                    <td>{item.sku}</td>
                    <td className="muted">
                      {Object.entries(item.attrs || {})
                        .map(([k, val]) => `${k}: ${val}`)
                        .join(' · ') || '—'}
                    </td>
                    <td>
                      <input
                        className="admin-stock-input"
                        type="number"
                        min="0"
                        value={stock[item.id] ?? '0'}
                        onChange={(e) =>
                          setStock((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => saveRow(item.id)}
                      >
                        {savingId === item.id ? 'Saving…' : 'Save'}
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

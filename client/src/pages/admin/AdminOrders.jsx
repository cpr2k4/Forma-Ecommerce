import { useEffect, useState } from 'react';
import { api } from '../../api';

const STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    api
      .adminOrders()
      .then((data) => setOrders(data.orders || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id, value) {
    setNotice('');
    setError('');
    setSavingId(id);
    try {
      const data = await api.adminUpdateOrderStatus(id, { status: value });
      setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
      setNotice(`Order updated to ${value}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h1 className="page-title">Orders</h1>
      <p className="muted">Fulfillment console — update status as you ship.</p>
      {notice && <div className="success">{notice}</div>}
      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="empty">Loading orders…</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Placed</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code style={{ fontSize: '0.78rem' }}>{row.id.slice(0, 8)}…</code>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>
                      {row.items?.length || 0} item(s)
                    </div>
                  </td>
                  <td>{new Date(row.placedAt).toLocaleString()}</td>
                  <td>
                    {row.customer?.fullName || '—'}
                    <div className="muted" style={{ fontSize: '0.8rem' }}>
                      {row.customer?.email}
                    </div>
                  </td>
                  <td>{row.total?.formatted}</td>
                  <td>
                    <select
                      value={row.status}
                      disabled={savingId === row.id}
                      onChange={(e) => updateStatus(row.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <div className="empty">No orders yet.</div>}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';

const STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const PREVIEW = [
  {
    id: 'preview-1',
    placedAt: 'Preview',
    customer: 'Store orders',
    total: '—',
    status: 'PAID',
  },
];

export default function AdminOrders() {
  const [status, setStatus] = useState({});
  const [notice, setNotice] = useState('');

  function updateStatus(id, value) {
    setStatus((prev) => ({ ...prev, [id]: value }));
    setNotice('UI only — order status APIs are not connected yet.');
  }

  return (
    <div>
      <h1 className="page-title">Orders</h1>
      <p className="muted">
        Fulfillment console. All-orders data needs the admin API; this layout is ready to bind.
      </p>
      {notice && <div className="success">{notice}</div>}

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
            {PREVIEW.map((row) => (
              <tr key={row.id}>
                <td className="muted">Awaiting admin feed</td>
                <td>{row.placedAt}</td>
                <td>{row.customer}</td>
                <td>{row.total}</td>
                <td>
                  <select
                    value={status[row.id] || row.status}
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
      </div>
    </div>
  );
}

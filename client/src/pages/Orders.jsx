import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Orders() {
  const { user } = useAuth();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const justPlaced = location.state?.justPlaced;

  useEffect(() => {
    if (!user) return;
    api
      .getOrders()
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message));
  }, [user]);

  if (!user) {
    return (
      <div className="container empty">
        <p>Log in to see your orders.</p>
        <Link className="btn btn-primary" to="/login">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="container section" style={{ paddingTop: '2.5rem' }}>
      <h1 className="page-title">Orders</h1>
      {justPlaced && (
        <div className="success">Order placed successfully. Reference: {justPlaced}</div>
      )}
      {error && <div className="error">{error}</div>}

      {orders.length === 0 ? (
        <div className="empty">No orders yet.</div>
      ) : (
        <div className="panel">
          {orders.map((order) => (
            <div className="order-card" key={order.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>Order {order.id.slice(0, 8)}</strong>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {new Date(order.placedAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge">{order.status}</span>
                  <div className="price" style={{ marginTop: '0.35rem' }}>
                    {order.total.formatted}
                  </div>
                </div>
              </div>
              <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.1rem' }}>
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.productName} × {item.quantity} — {item.lineTotal.formatted}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { mediaUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { user } = useAuth();
  const { cart, loading, updateItem, removeItem } = useCart();

  if (!user) {
    return (
      <div className="container empty">
        <p>Please log in to view your cart.</p>
        <Link className="btn btn-primary" to="/login">
          Log in
        </Link>
      </div>
    );
  }

  if (loading || !cart) {
    return <div className="container empty">Loading cart...</div>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="container empty">
        <p>Your cart is empty.</p>
        <Link className="btn btn-primary" to="/shop">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container cart-layout">
      <div className="panel">
        <h1 className="page-title" style={{ fontSize: '2rem' }}>
          Cart
        </h1>
        {cart.items.map((item) => (
          <div className="cart-item" key={item.id}>
            <img src={mediaUrl(item.product.imageUrl)} alt={item.product.name} />
            <div>
              <strong>{item.product.name}</strong>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                {Object.values(item.attrs || {}).join(' · ')}
              </div>
              <div className="qty-controls">
                <button
                  type="button"
                  onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => updateItem(item.id, item.quantity + 1)}>
                  +
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => removeItem(item.id)}>
                  Remove
                </button>
              </div>
            </div>
            <div className="price">{item.lineTotal.formatted}</div>
          </div>
        ))}
      </div>

      <aside className="panel">
        <h2 style={{ marginTop: 0 }}>Summary</h2>
        <div className="summary-row">
          <span>Subtotal</span>
          <span>{cart.subtotal.formatted}</span>
        </div>
        <div className="summary-row muted">
          <span>Items</span>
          <span>{cart.itemCount}</span>
        </div>
        <Link className="btn btn-primary" to="/checkout" style={{ width: '100%', marginTop: '1rem' }}>
          Checkout
        </Link>
      </aside>
    </div>
  );
}

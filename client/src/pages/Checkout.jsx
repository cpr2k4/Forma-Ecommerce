import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { user } = useAuth();
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',
  });

  if (!user) {
    return (
      <div className="container empty">
        <p>Log in to checkout.</p>
        <Link className="btn btn-primary" to="/login">
          Log in
        </Link>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container empty">
        <p>Your cart is empty.</p>
        <Link className="btn btn-primary" to="/shop">
          Shop
        </Link>
      </div>
    );
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await api.checkout({ shippingAddress: form });
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay. Check your network.');

      const options = {
        key: data.razorpay.keyId,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        name: 'FORMA',
        description: `Order ${data.order.id.slice(0, 8)}`,
        order_id: data.razorpay.orderId,
        prefill: {
          name: form.fullName,
          email: user.email,
          contact: form.phone,
        },
        theme: { color: '#0d8f6f' },
        handler: async (response) => {
          try {
            const result = await api.confirmPayment(data.order.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refreshCart();
            navigate('/orders', { state: { justPlaced: result.order.id } });
          } catch (err) {
            setError(err.message);
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment failed');
        setSubmitting(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="container checkout-layout">
      <form className="panel form" onSubmit={handleSubmit}>
        <h1 className="page-title" style={{ fontSize: '2rem' }}>
          Checkout
        </h1>
        <p className="muted">Pay securely with Razorpay (UPI, cards, wallets — test mode).</p>

        {error && <div className="error">{error}</div>}

        <label>
          Full name
          <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
        </label>
        <label>
          Phone
          <input required value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>
        <label>
          Address line 1
          <input required value={form.line1} onChange={(e) => update('line1', e.target.value)} />
        </label>
        <label>
          Address line 2
          <input value={form.line2} onChange={(e) => update('line2', e.target.value)} />
        </label>
        <div className="form-row">
          <label>
            City
            <input required value={form.city} onChange={(e) => update('city', e.target.value)} />
          </label>
          <label>
            State
            <input value={form.state} onChange={(e) => update('state', e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Postal code
            <input
              required
              value={form.postalCode}
              onChange={(e) => update('postalCode', e.target.value)}
            />
          </label>
          <label>
            Country
            <input required value={form.country} onChange={(e) => update('country', e.target.value)} />
          </label>
        </div>

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Opening Razorpay...' : 'Pay with Razorpay'}
        </button>
      </form>

      <aside className="panel">
        <h2 style={{ marginTop: 0 }}>Order summary</h2>
        {cart.items.map((item) => (
          <div className="summary-row" key={item.id}>
            <span>
              {item.product.name} × {item.quantity}
            </span>
            <span>{item.lineTotal.formatted}</span>
          </div>
        ))}
        <div className="summary-row total">
          <span>Subtotal</span>
          <span>{cart.subtotal.formatted}</span>
        </div>
      </aside>
    </div>
  );
}

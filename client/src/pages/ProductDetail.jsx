import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, mediaUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api
      .getProduct(slug)
      .then((data) => {
        setProduct(data.product);
        setVariantId(data.product.variants[0]?.id || '');
      })
      .catch((err) => setError(err.message));
  }, [slug]);

  async function handleAdd() {
    setError('');
    setMessage('');
    if (!user) {
      navigate('/login');
      return;
    }
    setAdding(true);
    try {
      await addItem(variantId, 1);
      setMessage('Added to cart');
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  if (error && !product) {
    return (
      <div className="container section">
        <div className="error">{error}</div>
        <Link to="/shop">Back to shop</Link>
      </div>
    );
  }

  if (!product) {
    return <div className="container empty">Loading...</div>;
  }

  const selected = product.variants.find((v) => v.id === variantId);

  return (
    <div className="container detail">
      <div className="detail-media">
        <img src={mediaUrl(product.imageUrl)} alt={product.name} />
      </div>
      <div className="detail-info">
        <p className="muted">{product.brand}</p>
        <h1>{product.name}</h1>
        <p className="price" style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
          {selected?.price.formatted || product.price.formatted}
        </p>
        <p>{product.description}</p>

        <div className="variant-row">
          {product.variants.map((v) => {
            const label = Object.values(v.attrs || {}).join(' · ') || v.sku;
            return (
              <button
                key={v.id}
                type="button"
                className={`chip ${v.id === variantId ? 'active' : ''}`}
                onClick={() => setVariantId(v.id)}
                disabled={!v.inStock}
              >
                {label}
                {!v.inStock ? ' (out)' : ''}
              </button>
            );
          })}
        </div>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="button" onClick={handleAdd} disabled={adding || !selected?.inStock}>
            {adding ? 'Adding...' : 'Add to cart'}
          </button>
          <Link className="btn btn-ghost" to="/cart">
            View cart
          </Link>
        </div>
      </div>
    </div>
  );
}

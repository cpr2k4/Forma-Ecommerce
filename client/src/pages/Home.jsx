import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import IntroLanding from '../components/IntroLanding';

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.getProducts().then((data) => setProducts(data.products.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <>
      <IntroLanding />
      <section className="hero">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-content">
          <h1 className="hero-brand">FORMA</h1>
          <p className="hero-copy">
            Designed for the next everyday — electronics, fashion, and home goods with clean lines and lasting presence.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/shop">
              Enter the shop
            </Link>
            <Link className="btn btn-ghost" to="/register">
              Create account
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Signal picks</h2>
              <p>Featured from the live catalog.</p>
            </div>
            <Link to="/shop" className="btn btn-ghost">
              View all
            </Link>
          </div>
          <div className="product-grid">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

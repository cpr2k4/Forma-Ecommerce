import { Link } from 'react-router-dom';
import { mediaUrl } from '../api';

export default function ProductCard({ product, index = 0 }) {
  return (
    <Link
      to={`/product/${product.slug}`}
      className="product-tile"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <img src={mediaUrl(product.imageUrl)} alt={product.name} />
      <div className="product-meta">
        <div className="brand-label">{product.brand}</div>
        <h3>{product.name}</h3>
        <div className="price">{product.price.formatted}</div>
      </div>
    </Link>
  );
}

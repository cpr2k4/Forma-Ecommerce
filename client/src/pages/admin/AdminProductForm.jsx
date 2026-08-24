import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';

const emptyVariant = () => ({
  sku: '',
  color: '',
  size: '',
  price: '',
  stockQty: '0',
});

const emptyForm = {
  name: '',
  slug: '',
  brand: '',
  description: '',
  categorySlug: '',
  imageUrl: '',
  basePrice: '',
  isPublished: true,
  variants: [emptyVariant()],
};

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.getCategories().then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .getProducts()
      .then((data) => {
        const product = (data.products || []).find((p) => p.id === id);
        if (!product) {
          setNotice('Product not found in catalog.');
          return;
        }
        setForm({
          name: product.name || '',
          slug: product.slug || '',
          brand: product.brand || '',
          description: product.description || '',
          categorySlug: product.category?.slug || '',
          imageUrl: product.imageUrl || '',
          basePrice: product.price?.formatted?.replace(/[^\d.]/g, '') || '',
          isPublished: true,
          variants: (product.variants || []).map((v) => ({
            sku: v.sku || '',
            color: v.attrs?.color || '',
            size: v.attrs?.size || '',
            price: v.price?.formatted?.replace(/[^\d.]/g, '') || '',
            stockQty: String(v.stockQty ?? 0),
          })),
        });
      })
      .catch((err) => setNotice(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateVariant(index, field, value) {
    setForm((prev) => {
      const variants = prev.variants.map((v, i) => (i === index ? { ...v, [field]: value } : v));
      return { ...prev, variants };
    });
  }

  function addVariant() {
    setForm((prev) => ({ ...prev, variants: [...prev.variants, emptyVariant()] }));
  }

  function removeVariant(index) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setNotice(
      'UI only — saving will work once admin APIs are connected. Form values are ready to send.'
    );
  }

  function handleDelete() {
    setNotice('UI only — delete is not wired to the API yet.');
  }

  if (loading) return <div className="empty">Loading product…</div>;

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit product' : 'New product'}</h1>
          <p className="muted">Catalog fields match the live product schema.</p>
        </div>
        <Link className="btn btn-ghost" to="/admin/products">
          Back
        </Link>
      </div>

      {notice && <div className="success">{notice}</div>}

      <form className="form panel" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Name
            <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
          </label>
          <label>
            Slug
            <input required value={form.slug} onChange={(e) => update('slug', e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Brand
            <input value={form.brand} onChange={(e) => update('brand', e.target.value)} />
          </label>
          <label>
            Category
            <select
              value={form.categorySlug}
              onChange={(e) => update('categorySlug', e.target.value)}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Description
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Image URL
            <input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} />
          </label>
          <label>
            Base price (display)
            <input
              value={form.basePrice}
              onChange={(e) => update('basePrice', e.target.value)}
              placeholder="7999"
            />
          </label>
        </div>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => update('isPublished', e.target.checked)}
          />
          Published on storefront
        </label>

        <h3 className="admin-subhead">Variants / SKUs</h3>
        {form.variants.map((v, i) => (
          <div className="admin-variant" key={i}>
            <input
              placeholder="SKU"
              value={v.sku}
              onChange={(e) => updateVariant(i, 'sku', e.target.value)}
            />
            <input
              placeholder="Color"
              value={v.color}
              onChange={(e) => updateVariant(i, 'color', e.target.value)}
            />
            <input
              placeholder="Size"
              value={v.size}
              onChange={(e) => updateVariant(i, 'size', e.target.value)}
            />
            <input
              placeholder="Price"
              value={v.price}
              onChange={(e) => updateVariant(i, 'price', e.target.value)}
            />
            <input
              placeholder="Stock"
              value={v.stockQty}
              onChange={(e) => updateVariant(i, 'stockQty', e.target.value)}
            />
            {form.variants.length > 1 && (
              <button className="btn btn-ghost" type="button" onClick={() => removeVariant(i)}>
                Remove
              </button>
            )}
          </div>
        ))}
        <button className="btn btn-ghost" type="button" onClick={addVariant}>
          Add variant
        </button>

        <div className="admin-actions">
          <button className="btn btn-primary" type="submit">
            {isEdit ? 'Save changes' : 'Create product'}
          </button>
          {isEdit && (
            <button className="btn btn-ghost" type="button" onClick={handleDelete}>
              Delete
            </button>
          )}
          <button className="btn btn-ghost" type="button" onClick={() => navigate('/admin/products')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

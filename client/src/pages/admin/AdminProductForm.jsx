import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, mediaUrl } from '../../api';

const emptyVariant = () => ({
  id: undefined,
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

function centsToRupees(cents) {
  if (cents == null) return '';
  return String(cents / 100);
}

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.adminCategories().then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .adminProduct(id)
      .then((data) => {
        const product = data.product;
        setForm({
          name: product.name || '',
          slug: product.slug || '',
          brand: product.brand || '',
          description: product.description || '',
          categorySlug: product.category?.slug || '',
          imageUrl: product.imageUrl || '',
          basePrice: centsToRupees(product.basePriceCents),
          isPublished: Boolean(product.isPublished),
          variants: (product.variants || []).map((v) => ({
            id: v.id,
            sku: v.sku || '',
            color: v.attrs?.color || '',
            size: v.attrs?.size || '',
            price: centsToRupees(v.priceCents),
            stockQty: String(v.stockQty ?? 0),
          })),
        });
      })
      .catch((err) => setError(err.message))
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

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    setUploadingImage(true);
    try {
      const data = await api.adminUploadProductImage(file);
      update('imageUrl', data.imageUrl || '');
      setNotice('Image uploaded. Save the product to keep it.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);

    const payload = {
      name: form.name,
      slug: form.slug,
      brand: form.brand || null,
      description: form.description || null,
      categorySlug: form.categorySlug || null,
      imageUrl: form.imageUrl || null,
      basePrice: form.basePrice,
      isPublished: form.isPublished,
      variants: form.variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku,
        color: v.color,
        size: v.size,
        price: v.price,
        stockQty: Number(v.stockQty),
      })),
    };

    try {
      if (isEdit) {
        await api.adminUpdateProduct(id, payload);
        setNotice('Product updated.');
      } else {
        const data = await api.adminCreateProduct(payload);
        setNotice('Product created.');
        navigate(`/admin/products/${data.product.id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this product permanently?')) return;
    setError('');
    setSaving(true);
    try {
      await api.adminDeleteProduct(id);
      navigate('/admin/products');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <div className="empty">Loading product…</div>;

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit product' : 'New product'}</h1>
          <p className="muted">Prices are in rupees (e.g. 7999 = ₹7,999).</p>
        </div>
        <Link className="btn btn-ghost" to="/admin/products">
          Back
        </Link>
      </div>

      {error && <div className="error">{error}</div>}
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
        <div className="admin-image-row">
          {form.imageUrl ? (
            <img className="admin-image-preview" src={mediaUrl(form.imageUrl)} alt="" />
          ) : (
            <div className="admin-image-preview admin-image-preview--empty">No image</div>
          )}
          <div className="admin-image-fields">
            <label>
              Upload image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
              <span className="muted">
                {uploadingImage ? 'Uploading…' : 'JPEG, PNG, WebP, or GIF · max 5MB'}
              </span>
            </label>
            <label>
              Or image URL
              <input
                value={form.imageUrl}
                onChange={(e) => update('imageUrl', e.target.value)}
                placeholder="/uploads/products/… or https://…"
              />
            </label>
          </div>
          <label>
            Base price (₹)
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
          <div className="admin-variant" key={v.id || i}>
            <input
              placeholder="SKU"
              required
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
              placeholder="Price ₹"
              required
              value={v.price}
              onChange={(e) => updateVariant(i, 'price', e.target.value)}
            />
            <input
              placeholder="Stock"
              required
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
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </button>
          {isEdit && (
            <button className="btn btn-ghost" type="button" onClick={handleDelete} disabled={saving}>
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

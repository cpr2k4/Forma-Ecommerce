import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, mediaUrl } from '../api';
import { useAuth } from '../context/AuthContext';

const emptyAddress = {
  label: '',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'IN',
  isDefault: false,
};

export default function Profile() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: '',
  });
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .getProfile()
      .then((data) => {
        setProfile({
          fullName: data.user.fullName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          avatarUrl: data.user.avatarUrl || '',
        });
        setAddresses(data.addresses || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <div className="empty">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  function updateProfileField(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function updateAddressField(field, value) {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    setUploadingAvatar(true);
    try {
      const data = await api.uploadAvatar(file);
      setProfile((prev) => ({ ...prev, avatarUrl: data.user.avatarUrl || '' }));
      updateUser(data.user);
      setNotice('Avatar updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSavingProfile(true);
    try {
      const data = await api.updateProfile({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone || null,
      });
      updateUser(data.user);
      setNotice('Profile saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  function startEdit(address) {
    setEditingId(address.id);
    setAddressForm({
      label: address.label || '',
      fullName: address.fullName || '',
      phone: address.phone || '',
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || 'IN',
      isDefault: Boolean(address.isDefault),
    });
    setNotice('');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setAddressForm(emptyAddress);
  }

  async function handleSaveAddress(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSavingAddress(true);
    const payload = {
      ...addressForm,
      label: addressForm.label || null,
      line2: addressForm.line2 || null,
      state: addressForm.state || null,
    };
    try {
      if (editingId) {
        const data = await api.updateAddress(editingId, payload);
        setAddresses((prev) => prev.map((a) => (a.id === editingId ? data.address : a)));
        if (data.address.isDefault) {
          setAddresses((prev) =>
            prev.map((a) => ({ ...a, isDefault: a.id === data.address.id }))
          );
        }
        setNotice('Address updated.');
      } else {
        const data = await api.createAddress(payload);
        setAddresses((prev) => {
          const next = data.address.isDefault
            ? prev.map((a) => ({ ...a, isDefault: false }))
            : prev;
          return [...next, data.address];
        });
        setNotice('Address added.');
      }
      cancelEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleDeleteAddress(id) {
    if (!window.confirm('Delete this address?')) return;
    setError('');
    setNotice('');
    try {
      await api.deleteAddress(id);
      const data = await api.getProfile();
      setAddresses(data.addresses || []);
      setNotice('Address deleted.');
      if (editingId === id) cancelEdit();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSetDefault(id) {
    setError('');
    setNotice('');
    try {
      const data = await api.setDefaultAddress(id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === data.address.id }))
      );
      setNotice('Default address updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container section profile-page">
      <h1 className="page-title">Your profile</h1>
      <p className="muted">Update your details and saved addresses.</p>

      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}

      {loading ? (
        <div className="empty">Loading profile…</div>
      ) : (
        <div className="profile-grid">
          <form className="form panel profile-card" onSubmit={handleSaveProfile}>
            <h2 className="admin-subhead" style={{ marginTop: 0 }}>
              Account
            </h2>
            <div className="profile-avatar-row">
              <div className="profile-avatar">
                {profile.avatarUrl ? (
                  <img src={mediaUrl(profile.avatarUrl)} alt="" />
                ) : (
                  <span>{(profile.fullName || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <label className="profile-avatar-field">
                Profile picture
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                />
                <span className="muted">
                  {uploadingAvatar ? 'Uploading…' : 'JPEG, PNG, WebP, or GIF · max 5MB'}
                </span>
              </label>
            </div>
            <label>
              Full name
              <input
                required
                value={profile.fullName}
                onChange={(e) => updateProfileField('fullName', e.target.value)}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={profile.email}
                onChange={(e) => updateProfileField('email', e.target.value)}
              />
            </label>
            <label>
              Contact number
              <input
                value={profile.phone}
                onChange={(e) => updateProfileField('phone', e.target.value)}
                placeholder="9876543210"
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </form>

          <div className="profile-addresses">
            <div className="panel">
              <h2 className="admin-subhead" style={{ marginTop: 0 }}>
                Saved addresses
              </h2>
              {addresses.length === 0 ? (
                <p className="muted">No addresses yet. Add one below.</p>
              ) : (
                <ul className="address-list">
                  {addresses.map((a) => (
                    <li key={a.id} className="address-card">
                      <div>
                        <strong>
                          {a.label || 'Address'}
                          {a.isDefault && <span className="badge">Default</span>}
                        </strong>
                        <p>
                          {a.fullName} · {a.phone}
                        </p>
                        <p className="muted">
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ''}
                          <br />
                          {a.city}
                          {a.state ? `, ${a.state}` : ''} {a.postalCode}
                          <br />
                          {a.country}
                        </p>
                      </div>
                      <div className="address-actions">
                        <button className="btn btn-ghost" type="button" onClick={() => startEdit(a)}>
                          Edit
                        </button>
                        {!a.isDefault && (
                          <button
                            className="btn btn-ghost"
                            type="button"
                            onClick={() => handleSetDefault(a.id)}
                          >
                            Set default
                          </button>
                        )}
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => handleDeleteAddress(a.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form className="form panel" onSubmit={handleSaveAddress}>
              <h2 className="admin-subhead" style={{ marginTop: 0 }}>
                {editingId ? 'Edit address' : 'Add address'}
              </h2>
              <div className="form-row">
                <label>
                  Label
                  <input
                    value={addressForm.label}
                    onChange={(e) => updateAddressField('label', e.target.value)}
                    placeholder="Home"
                  />
                </label>
                <label>
                  Full name
                  <input
                    required
                    value={addressForm.fullName}
                    onChange={(e) => updateAddressField('fullName', e.target.value)}
                  />
                </label>
              </div>
              <label>
                Phone
                <input
                  required
                  value={addressForm.phone}
                  onChange={(e) => updateAddressField('phone', e.target.value)}
                />
              </label>
              <label>
                Address line 1
                <input
                  required
                  value={addressForm.line1}
                  onChange={(e) => updateAddressField('line1', e.target.value)}
                />
              </label>
              <label>
                Address line 2
                <input
                  value={addressForm.line2}
                  onChange={(e) => updateAddressField('line2', e.target.value)}
                />
              </label>
              <div className="form-row">
                <label>
                  City
                  <input
                    required
                    value={addressForm.city}
                    onChange={(e) => updateAddressField('city', e.target.value)}
                  />
                </label>
                <label>
                  State
                  <input
                    value={addressForm.state}
                    onChange={(e) => updateAddressField('state', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Postal code
                  <input
                    required
                    value={addressForm.postalCode}
                    onChange={(e) => updateAddressField('postalCode', e.target.value)}
                  />
                </label>
                <label>
                  Country
                  <input
                    required
                    value={addressForm.country}
                    onChange={(e) => updateAddressField('country', e.target.value)}
                  />
                </label>
              </div>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => updateAddressField('isDefault', e.target.checked)}
                />
                Set as default
              </label>
              <div className="admin-actions">
                <button className="btn btn-primary" type="submit" disabled={savingAddress}>
                  {savingAddress ? 'Saving…' : editingId ? 'Update address' : 'Add address'}
                </button>
                {editingId && (
                  <button className="btn btn-ghost" type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <p className="muted">
              Need your orders? <Link to="/orders">View order history</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

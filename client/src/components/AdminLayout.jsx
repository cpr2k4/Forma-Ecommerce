import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/orders', label: 'Orders' },
];

export default function AdminLayout() {
  return (
    <div className="container admin-shell">
      <aside className="admin-side">
        <p className="admin-kicker">FORMA // CONTROL</p>
        <h2>Admin</h2>
        <p className="muted">Catalog, stock, and fulfillment.</p>
        <nav className="admin-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}

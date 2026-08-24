import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ChatBot from './ChatBot';

export default function Layout() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const count = cart?.itemCount || 0;

  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <Link to="/" className="brand">
            FORMA<span>.</span>
          </Link>
          <nav className="nav-links">
            <NavLink to="/shop">Shop</NavLink>
            {user && (
              <NavLink to="/orders" className="hide-sm">
                Orders
              </NavLink>
            )}
            {user ? (
              <>
                <span className="hide-sm muted">{user.fullName.split(' ')[0]}</span>
                <button className="btn btn-ghost" type="button" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <NavLink to="/login">Log in</NavLink>
            )}
            <Link to="/cart" className="cart-pill">
              Cart
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">FORMA — next-gen everyday goods · Local MVP</div>
      </footer>
      <ChatBot />
    </>
  );
}

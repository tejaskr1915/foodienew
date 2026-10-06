import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { FiShoppingBag, FiChevronDown, FiClock, FiInfo, FiLogOut, FiMapPin } from 'react-icons/fi';
import { orderService, getCustomerPhone } from '../../services/orderService';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartItems } = useCart();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/customer/welcome');
  };

  const totalQuantity = (cartItems || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

  const [customerPhone, setCustomerPhone] = useState(() => user?.phone || getCustomerPhone() || '');

  useEffect(() => {
    const syncPhone = () => {
      const p = user?.phone || getCustomerPhone() || '';
      setCustomerPhone(p);
    };
    syncPhone();
    window.addEventListener('foodie_orders_updated', syncPhone);
    window.addEventListener('storage', syncPhone);
    return () => {
      window.removeEventListener('foodie_orders_updated', syncPhone);
      window.removeEventListener('storage', syncPhone);
    };
  }, [user]);

  const formattedPhone = customerPhone ? (String(customerPhone).startsWith('+') ? customerPhone : `+91 ${String(customerPhone).replace(/\D/g, '').slice(-10)}`) : '';

  return (
    <nav className="navbar navbar-expand-md navbar-light bg-white sticky-top py-2 border-bottom shadow-sm">
      <div className="container px-3">
        {/* Left Side: Brand */}
        <Link to="/customer/home" className="navbar-brand d-flex align-items-center fw-bold text-dark gap-2">
          <span 
            className="text-white rounded-3 d-flex align-items-center justify-content-center fw-bold"
            style={{ width: '38px', height: '38px', fontSize: '20px', backgroundColor: 'var(--primary-color)' }}
          >
            F
          </span>
          <span className="fw-bold fs-4 text-dark" style={{ letterSpacing: '-0.5px' }}>Foodie</span>
        </Link>

        {/* Right Side Items */}
        <div className="d-flex align-items-center gap-3 ms-auto">
          {/* Cart Bag Icon Button */}
          {totalQuantity > 0 && (
            <Link 
              to="/customer/cart" 
              className="position-relative d-flex align-items-center justify-content-center text-dark bg-light rounded-circle"
              style={{ width: '40px', height: '40px', transition: 'all 0.2s ease', border: '1px solid var(--border-color)' }}
              aria-label="View shopping cart"
            >
              <FiShoppingBag size={20} />
              <span 
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white"
                style={{ fontSize: '9px', padding: '4px 6px', backgroundColor: 'var(--primary-color)' }}
              >
                {totalQuantity}
              </span>
            </Link>
          )}

          {isAuthenticated ? (
            /* Profile Avatar / Dropdown Container */
            <div className="position-relative border-start ps-3">
              <div 
                className="d-flex align-items-center gap-2 cursor-pointer"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div 
                  className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center fw-bold text-white bg-danger"
                  style={{ width: '36px', height: '36px', backgroundColor: 'var(--primary-color)', fontSize: '14px' }}
                >
                  {user?.role === 'admin' || user?.role === 'employee' ? (user?.name?.charAt(0).toUpperCase() || 'A') : 'C'}
                </div>
                <div className="d-none d-md-flex align-items-center gap-1 cursor-pointer">
                  <span className="fw-bold small text-dark">
                    {user?.role === 'admin' || user?.role === 'employee' ? (user?.name || 'Staff') : (formattedPhone || (user?.name && user.name !== 'Customer' ? user.name : 'Customer'))}
                  </span>
                  <FiChevronDown size={14} className="text-muted" />
                </div>
              </div>

              {/* Dropdown Menu Overlay */}
              {showDropdown && (
                <>
                  <div 
                    className="position-fixed top-0 start-0 w-100 h-100" 
                    style={{ zIndex: 999, cursor: 'default' }}
                    onClick={() => setShowDropdown(false)}
                  />
                  <div 
                    className="dropdown-menu show position-absolute end-0 mt-2 shadow border-0 p-3 rounded-3" 
                    style={{ minWidth: '220px', zIndex: 1000, top: '100%' }}
                  >
                    {/* User details header */}
                    <div className="border-bottom pb-2 mb-2">
                      {user?.role === 'admin' || user?.role === 'employee' ? (
                        <>
                          <div className="fw-bold text-dark small">{user?.name || 'Staff'}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{user?.email || ''}</div>
                          <span className="badge bg-light text-danger border border-danger-subtle fw-semibold mt-1 text-uppercase" style={{ fontSize: '9px' }}>
                            {user?.role || 'Staff'}
                          </span>
                        </>
                      ) : (
                        <div>
                          <div className="fw-bold text-dark small">{formattedPhone || (user?.name && user.name !== 'Customer' ? user.name : 'Customer')}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>Customer Account</div>
                        </div>
                      )}
                    </div>

                    {/* Dropdown items */}
                    {(user?.role === 'admin' || user?.role === 'employee') && (
                      <>
                        <Link 
                          to={user?.role === 'admin' ? "/admin/tables" : "/admin/employee-dashboard"} 
                          className="dropdown-item py-2 px-2 small text-danger fw-bold rounded d-flex align-items-center gap-2 hover-bg-light text-decoration-none"
                          onClick={() => setShowDropdown(false)}
                        >
                          <i className="bi bi-grid"></i> {user?.role === 'admin' ? "Manage Tables" : "Employee Portal"}
                        </Link>
                        {user?.role === 'admin' && (
                          <Link 
                            to="/admin/dashboard" 
                            className="dropdown-item py-2 px-2 small text-secondary rounded d-flex align-items-center gap-2 hover-bg-light text-decoration-none"
                            onClick={() => setShowDropdown(false)}
                          >
                            <i className="bi bi-speedometer2"></i> Admin Dashboard
                          </Link>
                        )}
                      </>
                    )}

                    <Link 
                      to="/customer/orders" 
                      className="dropdown-item py-2 px-2 small text-secondary rounded d-flex align-items-center gap-2 hover-bg-light text-decoration-none"
                      onClick={() => setShowDropdown(false)}
                    >
                      <FiClock /> Order History
                    </Link>

                    <button 
                      onClick={() => {
                        setShowDropdown(false);
                        alert('Foodie Restaurant Ordering Platform v1.0. Developed with love.');
                      }}
                      className="dropdown-item py-2 px-2 small text-secondary rounded d-flex align-items-center gap-2 border-0 bg-transparent text-start"
                    >
                      <FiInfo /> About Us
                    </button>

                    <hr className="dropdown-divider my-2" />

                    <button 
                      onClick={() => {
                        setShowDropdown(false);
                        handleLogout();
                      }}
                      className="dropdown-item py-2 px-2 small text-danger rounded d-flex align-items-center gap-2 border-0 bg-transparent text-start fw-bold"
                    >
                      <FiLogOut /> Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/customer/welcome" className="btn btn-danger rounded-pill fw-bold btn-sm px-4">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;

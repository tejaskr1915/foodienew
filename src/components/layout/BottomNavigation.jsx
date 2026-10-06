import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { FiHome, FiShoppingCart, FiClock, FiLogOut } from 'react-icons/fi';

export const BottomNavigation = () => {
  const { cartItems } = useCart();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/customer/welcome');
  };

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="customer-bottom-nav">
      <NavLink to="/customer/home" className="customer-bottom-nav-item">
        <FiHome />
        <span>Menu</span>
      </NavLink>

      <NavLink to="/customer/cart" className="customer-bottom-nav-item position-relative">
        <FiShoppingCart />
        <span>Cart</span>
        {totalQuantity > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '10px' }}>
            {totalQuantity}
          </span>
        )}
      </NavLink>

      <NavLink to="/customer/orders" className="customer-bottom-nav-item">
        <FiClock />
        <span>History</span>
      </NavLink>

      {user && (
        <button 
          onClick={handleLogout} 
          className="btn border-0 p-0 customer-bottom-nav-item bg-transparent"
        >
          <FiLogOut />
          <span>Logout</span>
        </button>
      )}
    </nav>
  );
};
export default BottomNavigation;

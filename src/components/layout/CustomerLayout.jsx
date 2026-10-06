import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import MobileFloatingCartBar from '../customer/MobileFloatingCartBar';
import Header from './Header';
import Footer from './Footer';
import { useCart } from '../../hooks/useCart';
import { orderService, isOrderOwnedByCustomer } from '../../services/orderService';
import formatCurrency from '../../utils/formatCurrency';
import Toast from '../common/Toast';
import { FiChevronRight } from 'react-icons/fi';

export const CustomerLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tableContext, cartItems } = useCart();
  const [toast, setToast] = useState({ show: false, message: '', type: 'add' });
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    const handleItemAdded = (e) => {
      setToast({ show: true, message: e.detail?.message || 'Item added to cart', type: 'add' });
    };
    const handleItemRemoved = (e) => {
      setToast({ show: true, message: e.detail?.message || 'Item removed from cart', type: 'remove' });
    };

    window.addEventListener('foodie_item_added', handleItemAdded);
    window.addEventListener('foodie_item_removed', handleItemRemoved);
    return () => {
      window.removeEventListener('foodie_item_added', handleItemAdded);
      window.removeEventListener('foodie_item_removed', handleItemRemoved);
    };
  }, []);

  // Real-time tracking of current active order across customer pages
  useEffect(() => {
    let isMounted = true;

    const fetchActiveOrder = async () => {
      try {
        const authRaw = localStorage.getItem('foodie_auth_customer') || sessionStorage.getItem('foodie_auth_customer') || '{}';
        const userObj = JSON.parse(authRaw)?.user;

        const orders = await orderService.getOrders(userObj?.phone || userObj?.id, false).catch(() => []);
        const latestFromApi = orderService.getLatestActiveOrder(orders);

        if (latestFromApi && isMounted && isOrderOwnedByCustomer(latestFromApi, userObj)) {
          const st = String(latestFromApi.status || '').toLowerCase().trim();
          if (!['completed', 'cancelled', 'delivered'].includes(st)) {
            setActiveOrder(latestFromApi);
            return;
          }
        }

        if (isMounted) {
          setActiveOrder(null);
        }
      } catch (err) {
        if (isMounted) {
          setActiveOrder(null);
        }
      }
    };

    fetchActiveOrder();

    const handleSync = () => fetchActiveOrder();
    window.addEventListener('foodie_orders_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('foodie_orders_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [location.pathname]);

  const hasCartItems = (cartItems || []).length > 0;

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      {/* Table Context Overlay Banner */}
      {(() => {
        const savedType = sessionStorage.getItem('foodie_order_type') || localStorage.getItem('foodie_order_type') || tableContext?.orderType;
        const isTakeaway = savedType === 'TAKEAWAY' || tableContext?.tableNumber === 'Takeaway';
        
        if (!tableContext && !savedType) return null;

        if (isTakeaway) {
          return (
            <div 
              className="bg-warning text-dark text-center py-2 px-3 fw-bold small shadow-sm d-flex align-items-center justify-content-center gap-2"
              style={{ zIndex: 1010 }}
            >
              <span>🛍️</span>
              <span>Ordering for: <strong>Takeaway (Pack & Go)</strong></span>
            </div>
          );
        }

        const tableDisplay = tableContext?.tableNumber && tableContext.tableNumber !== 'Takeaway' 
          ? tableContext.tableNumber 
          : 'T01';

        return (
          <div 
            className="bg-danger text-white text-center py-2 px-3 fw-bold small shadow-sm d-flex align-items-center justify-content-center gap-2"
            style={{ zIndex: 1010 }}
          >
            <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
            <span>Ordering for: <strong>Table Dine-In ({tableDisplay})</strong></span>
          </div>
        );
      })()}

      {/* Top Header Navigation */}
      <Header />

      {/* Main Content (Wide layout utilizing Bootstrap container system) */}
      <div className="flex-grow-1 py-4 container" style={{ paddingBottom: hasCartItems ? '140px' : '80px' }}>
        {children}
      </div>

      {/* Footer - Visible only on Customer Home page as requested */}
      {(() => {
        const path = location.pathname.toLowerCase().trim();
        const isHomePage = path === '/' || path === '/customer' || path === '/customer/' || path === '/customer/home';
        if (isHomePage) {
          return <Footer />;
        }
        return null;
      })()}

      {/* Mobile Floating Green Cart Option with Unlock Offer (Visible only on mobile web) */}
      <MobileFloatingCartBar />

      {/* Bottom Sticky Navigation (Visible only on mobile devices when cart is empty) */}
      {!hasCartItems && (
        <div className="d-md-none">
          <BottomNavigation />
        </div>
      )}

      {/* Global Add / Remove Cart Toast Confirmation */}
      <Toast 
        show={toast.show} 
        message={toast.message} 
        type={toast.type}
        onClose={() => setToast({ show: false, message: '', type: 'add' })} 
      />
    </div>
  );
};

export default CustomerLayout;

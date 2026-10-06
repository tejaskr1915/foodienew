import React, { useContext, useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { AppContext } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { FiAlignLeft, FiBell, FiChevronDown, FiLogOut, FiShoppingBag, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../../services/orderService';

export const AdminLayout = ({ children }) => {
  const { toggleSidebar, notifications, markAllRead, markAsRead, clearAll } = useContext(AppContext);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [toastOrder, setToastOrder] = useState(null);
  const knownNotifIdsRef = useRef(null);

  const { sidebarCollapsed } = useContext(AppContext);
  const unreadCount = (notifications || []).filter(n => !n.read).length;
  const sidebarWidth = sidebarCollapsed ? '70px' : '250px';

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    if (knownNotifIdsRef.current === null) {
      knownNotifIdsRef.current = new Set(notifications.map(n => String(n.id)));
      return;
    }

    const newUnreadNotif = notifications.find(n => !n.read && !knownNotifIdsRef.current.has(String(n.id)));

    if (newUnreadNotif) {
      knownNotifIdsRef.current.add(String(newUnreadNotif.id));
      const matchId = newUnreadNotif.text.match(/Order #(\d+)/i);
      const matchTable = newUnreadNotif.text.match(/Table:\s*([^,]+)/i);
      const matchTotal = newUnreadNotif.text.match(/Total:\s*₹?([\d.]+)/i);

      setToastOrder({
        id: matchId ? matchId[1] : 'New',
        table: matchTable ? matchTable[1].trim() : 'N/A',
        totalAmount: matchTotal ? matchTotal[1].trim() : 0
      });
    }
  }, [notifications]);

  const handleLogout = () => {
    setShowProfileDropdown(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-wrapper bg-light position-relative">
      <Sidebar />

      {/* Floating Live New Order Toast Alert (Top-Right) */}
      {toastOrder && (
        <div 
          className="position-fixed top-0 end-0 m-4 p-3 bg-dark text-white rounded-4 shadow-lg d-flex align-items-center justify-content-between gap-3 border border-secondary"
          style={{ zIndex: 9999, minWidth: '320px', animation: 'fadeInDown 0.3s ease' }}
        >
          <div className="d-flex align-items-center gap-3">
            <div className="bg-danger text-white rounded-circle p-2 d-flex align-items-center justify-content-center">
              <FiShoppingBag size={20} />
            </div>
            <div>
              <div className="fw-bold fs-6">New Order #{toastOrder.id}!</div>
              <div className="small text-white-50" style={{ fontSize: '11px' }}>
                Table: {toastOrder.table || 'N/A'} | Total: ₹{toastOrder.totalAmount || toastOrder.total_amount || 0}
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-1">
            <button 
              onClick={() => {
                setToastOrder(null);
                navigate('/admin/orders');
              }}
              className="btn btn-sm btn-danger rounded-pill px-3 py-1 fw-bold"
              style={{ fontSize: '11px' }}
            >
              View
            </button>
            <button 
              onClick={() => setToastOrder(null)}
              className="btn btn-link text-white-50 p-1 border-0"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}

      <div 
        className="flex-grow-1 d-flex flex-column min-vh-100 admin-main-content" 
        style={{ 
          marginLeft: sidebarWidth,
          minWidth: 0, 
          overflowX: 'hidden',
          transition: 'margin-left 0.2s ease'
        }}
      >
        {/* Admin Header */}
        <header className="admin-header shadow-sm position-relative">
          <div className="d-flex align-items-center gap-3">
            <button className="btn border-0 text-dark p-0" onClick={toggleSidebar}>
              <FiAlignLeft size={22} />
            </button>
            <h5 className="fw-bold mb-0 text-dark">Store Management</h5>
          </div>

          <div className="d-flex align-items-center gap-3 gap-md-4">
            {/* Notification Badge & Dropdown */}
            {user?.role !== 'employee' && (
              <div className="position-relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifDropdown(!showNotifDropdown);
                    setShowProfileDropdown(false);
                  }}
                  className="btn border-0 p-1 position-relative cursor-pointer bg-transparent"
                  title="Notifications"
                >
                  <FiBell size={20} className="text-secondary animate-bounce" />
                  {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-circle bg-danger p-1">
                      <span className="visually-hidden">unread messages</span>
                    </span>
                  )}
                </button>

              {/* Notification Dropdown Popup Menu */}
              {showNotifDropdown && (
                <>
                  <div 
                    className="position-fixed top-0 start-0 w-100 h-100" 
                    style={{ zIndex: 999, cursor: 'default' }}
                    onClick={() => setShowNotifDropdown(false)}
                  />
                  <div 
                    className="dropdown-menu show position-absolute end-0 mt-2 shadow-lg border-0 p-3 rounded-4 bg-white text-start" 
                    style={{ minWidth: '320px', maxWidth: '360px', zIndex: 1000, top: '100%' }}
                  >
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                      <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                          <span className="badge bg-danger rounded-pill px-2 py-0.5" style={{ fontSize: '10px' }}>
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {unreadCount > 0 && (
                          <button 
                            type="button"
                            onClick={() => markAllRead && markAllRead()}
                            className="btn btn-link btn-sm text-danger p-0 text-decoration-none fw-semibold"
                            style={{ fontSize: '11px' }}
                          >
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button 
                            type="button"
                            onClick={() => clearAll && clearAll()}
                            className="btn btn-link btn-sm text-secondary p-0 text-decoration-none fw-semibold"
                            style={{ fontSize: '11px' }}
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div className="text-center py-4 text-secondary small">
                          <FiBell size={28} className="text-muted mb-2 opacity-50 d-block mx-auto" />
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              if (markAsRead) markAsRead(n.id);
                              setShowNotifDropdown(false);
                              navigate('/admin/orders');
                            }}
                            className={`p-2.5 mb-1.5 rounded-3 border transition-all cursor-pointer ${
                              !n.read ? 'bg-light-subtle border-danger-subtle' : 'bg-white border-light-subtle opacity-75'
                            }`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-start gap-2">
                              <div className={`p-1.5 rounded-circle mt-0.5 ${!n.read ? 'bg-danger-subtle text-danger' : 'bg-secondary-subtle text-secondary'}`}>
                                <FiShoppingBag size={14} />
                              </div>
                              <div className="flex-grow-1" style={{ fontSize: '12px' }}>
                                <div className={`fw-semibold ${!n.read ? 'text-dark' : 'text-secondary'}`}>
                                  {n.text}
                                </div>
                                <div className="text-muted mt-1" style={{ fontSize: '10px' }}>
                                  {n.date ? new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </div>
                              </div>
                              {!n.read && (
                                <span className="bg-danger rounded-circle d-inline-block mt-1" style={{ width: '6px', height: '6px' }}></span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            )}

            {/* User Profile Info & Dropdown (Same pattern as Customer Profile) */}
            <div className="position-relative border-start ps-3">
              <div 
                className="d-flex align-items-center gap-2 cursor-pointer"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div 
                  className="text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm"
                  style={{ width: '36px', height: '36px', fontSize: '14px', backgroundColor: 'var(--primary-color)' }}
                >
                  {user?.name?.charAt(0).toUpperCase() || (user?.role === 'admin' ? 'A' : 'E')}
                </div>
                <div className="d-none d-md-flex align-items-center gap-1 cursor-pointer">
                  <div>
                    <div className="small fw-bold text-dark text-start" style={{ lineHeight: '1.2' }}>{user?.name || (user?.role === 'admin' ? 'Admin' : 'Staff')}</div>
                    <div className="text-secondary text-start text-uppercase" style={{ fontSize: '10px', letterSpacing: '0.4px' }}>{user?.role || 'Staff'}</div>
                  </div>
                  <FiChevronDown size={14} className="text-muted ms-1" />
                </div>
              </div>

              {/* Profile Dropdown Popup Menu */}
              {showProfileDropdown && (
                <>
                  <div 
                    className="position-fixed top-0 start-0 w-100 h-100" 
                    style={{ zIndex: 999, cursor: 'default' }}
                    onClick={() => setShowProfileDropdown(false)}
                  />
                  <div 
                    className="dropdown-menu show position-absolute end-0 mt-2 shadow border-0 p-3 rounded-3 bg-white" 
                    style={{ minWidth: '230px', zIndex: 1000, top: '100%' }}
                  >
                    {/* User details header */}
                    <div className="border-bottom pb-2 mb-2">
                      <div className="fw-bold text-dark small">{user?.name || (user?.role === 'admin' ? 'Administrator' : 'Staff Member')}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{user?.email || (user?.role === 'admin' ? 'admin@foodie.com' : 'staff@foodie.com')}</div>
                      <span className="badge bg-danger-subtle text-danger fw-semibold mt-1.5 text-uppercase" style={{ fontSize: '9.5px' }}>
                        {user?.role || 'Admin'} Account
                      </span>
                    </div>

                    {/* Logout Option */}
                    <button 
                      onClick={handleLogout}
                      className="dropdown-item py-2 px-2 small text-danger rounded d-flex align-items-center gap-2 border-0 bg-transparent text-start fw-bold"
                    >
                      <FiLogOut /> Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 flex-grow-1">
          {children}
        </main>
      </div>
    </div>
  );
};
export default AdminLayout;

import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { 
  FiGrid, FiShoppingBag, FiLayers, FiActivity, 
  FiSliders, FiLogOut, FiUsers, FiCpu, FiTag, FiBookOpen, FiMapPin 
} from 'react-icons/fi';

export const Sidebar = () => {
  const { sidebarCollapsed } = useContext(AppContext);
  const { logout, user } = useAuth();
  const isEmployee = user?.role === 'employee';

  const width = sidebarCollapsed ? '70px' : '250px';

  return (
    <div 
      className={`sidebar-container ${sidebarCollapsed ? 'collapsed' : ''}`}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        height: '100vh',
        width: width, 
        minWidth: width, 
        maxWidth: width, 
        flex: `0 0 ${width}`,
        zIndex: 1000,
        backgroundColor: '#1E1E2D',
        color: '#a2a3b7',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 20px 0 rgba(0, 0, 0, 0.25)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      <NavLink 
        to={isEmployee ? "/employee/dashboard" : "/admin/dashboard"}
        className="p-4 border-bottom border-secondary d-flex align-items-center justify-content-between text-decoration-none"
        style={{ cursor: 'pointer' }}
      >
        {!sidebarCollapsed && (
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger rounded-circle p-2">🍔</span>
            <span className="fw-bold text-white fs-5">{isEmployee ? 'Foodie Staff' : 'Foodie Admin'}</span>
          </div>
        )}
        {sidebarCollapsed && (
          <span className="badge bg-danger rounded-circle p-2 mx-auto">🍔</span>
        )}
      </NavLink>

      <ul className="list-unstyled flex-grow-1 p-3 mb-0 d-flex flex-column gap-1 overflow-auto">
        <li className="sidebar-section-title">
          {!sidebarCollapsed ? 'Main' : '•••'}
        </li>
        <li>
          <NavLink to={isEmployee ? "/employee/dashboard" : "/admin/dashboard"} className="sidebar-link">
            <FiGrid size={18} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/orders" className="sidebar-link">
            <FiShoppingBag size={18} />
            {!sidebarCollapsed && <span>Orders</span>}
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/tables" className="sidebar-link">
            <FiLayers size={18} />
            {!sidebarCollapsed && <span>Tables</span>}
          </NavLink>
        </li>
        <li>
          <NavLink to={isEmployee ? "/employee/kitchen" : "/admin/kitchen"} className="sidebar-link">
            <FiCpu size={18} />
            {!sidebarCollapsed && <span>Kitchen Queue</span>}
          </NavLink>
        </li>
        {!isEmployee && (
          <li>
            <NavLink to="/admin/menus" className="sidebar-link">
              <FiBookOpen size={18} />
              {!sidebarCollapsed && <span>Add Menu</span>}
            </NavLink>
          </li>
        )}

        <li className="sidebar-section-title">
          {!sidebarCollapsed ? 'Operations' : '•••'}
        </li>
        <li>
          <NavLink to={isEmployee ? "/employee/inventory" : "/admin/inventory"} className="sidebar-link">
            <FiSliders size={18} />
            {!sidebarCollapsed && <span>Inventory</span>}
          </NavLink>
        </li>
        {!isEmployee && (
          <>
            <li>
              <NavLink to="/admin/branches" className="sidebar-link">
                <FiMapPin size={18} />
                {!sidebarCollapsed && <span>Manage Branch</span>}
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/offers" className="sidebar-link">
                <FiTag size={18} />
                {!sidebarCollapsed && <span>Offers & Coupons</span>}
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/users" className="sidebar-link">
                <FiUsers size={18} />
                {!sidebarCollapsed && <span>Employee</span>}
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/settings" className="sidebar-link">
                <FiSliders size={18} />
                {!sidebarCollapsed && <span>Settings</span>}
              </NavLink>
            </li>
          </>
        )}
      </ul>

      <div className="p-3 border-top border-secondary mt-auto">
        {!sidebarCollapsed && (
          <div className="small text-secondary">
            Logged in as <strong className="text-white d-block">{user?.name || (isEmployee ? 'Staff' : 'Admin')}</strong>
          </div>
        )}
      </div>
    </div>
  );
};
export default Sidebar;

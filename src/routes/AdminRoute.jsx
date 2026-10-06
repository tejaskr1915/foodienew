import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/common/Loader';

export const AdminRoute = ({ children, allowEmployee = true }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Loader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'customer') {
    return <Navigate to="/customer/home" replace />;
  }

  if (!allowEmployee && user?.role === 'employee') {
    return <Navigate to="/admin/tables" replace />;
  }

  if (user?.role === 'employee' && location.pathname.startsWith('/admin')) {
    const newPath = location.pathname.replace('/admin', '/employee');
    return <Navigate to={newPath} replace />;
  }

  return children;
};
export default AdminRoute;

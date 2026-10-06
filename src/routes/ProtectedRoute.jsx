import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/common/Loader';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Loader />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (location.pathname.startsWith('/customer/')) {
      return <Navigate to="/customer/login" state={{ from: location.pathname }} replace />;
    }
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};
export default ProtectedRoute;

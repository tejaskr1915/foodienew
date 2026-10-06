import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const Splash = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      const search = location.search || '';
      if (isAuthenticated) {
        if (user?.role === 'employee') {
          navigate('/admin/tables');
        } else if (user?.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate(`/customer/home${search}`);
        }
      } else {
        navigate(`/customer/welcome${search}`);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user, navigate, location.search]);

  return (
    <div 
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center text-center"
      style={{
        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
        color: '#fff'
      }}
    >
      <div className="d-flex align-items-center justify-content-center bg-white rounded-circle shadow mb-4 p-3" style={{ width: '100px', height: '100px' }}>
        <h1 className="fw-bold text-danger mb-0" style={{ fontSize: '48px' }}>F</h1>
      </div>
      <h2 className="fw-bold mb-1">Foodie</h2>
      <p className="opacity-75 small">Ordering Made Simpler</p>
      
      <div className="spinner-border spinner-border-sm text-light mt-4" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
};
export default Splash;

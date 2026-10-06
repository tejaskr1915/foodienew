import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/welcome');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div 
      className="d-flex flex-column align-items-center justify-content-center vw-100 vh-100" 
      style={{ backgroundColor: 'var(--primary-color)' }}
    >
      <div className="text-center pulse-logo">
        <i className="bi bi-fast-food text-white" style={{ fontSize: '90px' }}></i>
        <h1 className="text-white fw-bold mt-2 display-4" style={{ letterSpacing: '1px' }}>Foodie</h1>
        <p className="text-white-50 fs-5 mt-2">Delicious food, delivered fast.</p>
      </div>
      
      <div className="position-absolute bottom-0 mb-5 text-center">
        <div className="spinner-border text-white-50 spinner-border-sm" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  );
};

export default Splash;

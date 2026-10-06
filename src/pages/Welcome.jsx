import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';

export const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-5 d-flex flex-column align-items-center justify-content-center min-vh-100">
      <div className="card shadow-lg border-0 p-4 p-md-5 text-center bg-white" style={{ maxWidth: '450px', borderRadius: '24px' }}>
        {/* Branding header */}
        <div className="mb-4">
          <i className="bi bi-fast-food-fill" style={{ color: 'var(--primary-color)', fontSize: '56px' }}></i>
          <h2 className="fw-bold mt-2 text-dark">Welcome to Foodie!</h2>
          <p className="text-muted small">Scan the QR code at your restaurant table or sign in to browse menu items.</p>
        </div>

        {/* QR Section */}
        <div className="my-4 p-4 border border-2 rounded-4 bg-light d-flex flex-column align-items-center justify-content-center">
          <div className="bg-white p-3 rounded shadow-sm border border-light mb-3">
            <svg width="180" height="180" viewBox="0 0 29 29" shapeRendering="crispEdges">
              <path fill="#ffffff" d="M0 0h29v29H0z" />
              <path fill="#111111" d="M0 0h7v7H0zm0 22h7v7H0zM22 0h7v7h-7zM2 2h3v3H2zm0 22h3v3H2zM24 2h3v3h-3zm-14 0h1v1h-1zm1 1h1v1h-1zm-1 1h1v1h-1zm1 1h1v1h-1zm-1 1h1v1h-1zm7-3h1v1h-1zm1 1h1v1h-1zm0 2h1v1h-1zm2-3h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-3 4h1v1h-1zm2 1h1v1h-1zm1-1h1v1h-1zm-1 2h1v1h-1zm-2 2h1v1h-1zm4 1h1v1h-1zm-1-2h1v1h-1zm-7 1h1v1h-1zm1 1h1v1h-1zm0-3h1v1h-1zm2 1h1v1h-1zm-1 2h1v1h-1z" />
            </svg>
          </div>
          <span className="fw-bold text-dark mb-1 small">Table QR Scanner</span>
          <span className="text-muted small text-center" style={{ fontSize: '12px' }}>
            Ordering in the restaurant? Scan table QR to pair your cart.
          </span>
        </div>

        {/* CTA Button */}
        <div className="d-grid gap-2 mt-3">
          <Button onClick={() => navigate('/login')} variant="primary" className="py-2.5">
            Sign In to Order
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;

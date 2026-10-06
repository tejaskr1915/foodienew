import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import BottomNavigation from '../components/layout/BottomNavigation';
import Button from '../components/common/Button';

export const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const stateOrder = location.state?.order || location.state || {};
  const orderId = stateOrder.id || stateOrder.orderId || '';
  const total = stateOrder.total || 0;
  const paymentMethod = stateOrder.paymentMethod || 'COD';

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Header />

      <main className="container py-5 flex-grow-1 px-3 d-flex align-items-center justify-content-center">
        <div className="card shadow-lg border-0 p-4 p-md-5 text-center bg-white rounded-4 w-100" style={{ maxWidth: '480px' }}>
          
          <div 
            className="d-flex align-items-center justify-content-center mb-4 rounded-circle mx-auto"
            style={{
              width: '90px',
              height: '90px',
              backgroundColor: 'var(--primary-light-color)',
              color: 'var(--primary-color)'
            }}
          >
            <i className="bi bi-check-circle" style={{ fontSize: '48px' }}></i>
          </div>

          <h2 className="fw-bold text-dark mb-1">Order Confirmed!</h2>
          <p className="text-muted small mb-4">Your order has been successfully placed and is being prepared.</p>

          <div className="p-3 border rounded-3 bg-light text-start mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-light-subtle">
              <span className="text-secondary small">Order ID</span>
              <span className="fw-bold text-dark">#{orderId}</span>
            </div>
            
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-light-subtle">
              <span className="text-secondary small">Estimated Delivery</span>
              <span className="fw-bold text-success">30 - 40 minutes</span>
            </div>
            
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-light-subtle">
              <span className="text-secondary small">Payment Method</span>
              <span className="fw-bold text-dark">{paymentMethod}</span>
            </div>

            <div className="d-flex align-items-center justify-content-between">
              <span className="text-secondary small">Total Amount Paid</span>
              <span className="fw-bold text-danger">₹{total}</span>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-6">
              <Button onClick={() => navigate('/orders')} variant="secondary" className="w-100 py-2.5">
                View Orders
              </Button>
            </div>
            <div className="col-6">
              <Button onClick={() => navigate('/home')} variant="primary" className="w-100 py-2.5">
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
};

export default OrderConfirmation;

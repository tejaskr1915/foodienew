import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import BottomNavigation from '../components/layout/BottomNavigation';
import Button from '../components/common/Button';

export const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Header />
      <main className="container py-5 flex-grow-1 px-3 d-flex flex-column align-items-center justify-content-center text-center">
        <div className="card shadow-sm border-0 p-5 bg-white rounded-4 w-100" style={{ maxWidth: '450px' }}>
          <h1 className="display-1 fw-bold text-danger mb-0">404</h1>
          <h4 className="fw-bold text-dark mt-2 mb-3">Page Not Found</h4>
          <p className="text-muted mb-4 small">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <Button onClick={() => navigate('/home')} variant="primary">
            Back to Home
          </Button>
        </div>
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  );
};

export default NotFound;

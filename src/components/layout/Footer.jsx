import React from 'react';
import { Link } from 'react-router-dom';

const restaurantInfo = {
  email: "support@foodie.com",
  phone: "+91 XXXXX XXXXX",
  address: "123 Foodie Street, Gourmet City, India"
};

export const Footer = () => {
  return (
    <footer className="bg-dark text-light py-5 mt-auto border-top" style={{ fontSize: '14px' }}>
      <div className="container">
        <div className="row g-4">
          {/* Brand & Support Section */}
          <div className="col-12 col-md-3 text-start">
            <span className="fw-bold fs-5 text-white d-inline-flex align-items-center gap-2 mb-3">
              <span 
                className="text-white rounded-3 d-flex align-items-center justify-content-center fw-bold"
                style={{ width: '32px', height: '32px', fontSize: '18px', backgroundColor: 'var(--primary-color)' }}
              >
                F
              </span>
              Foodie
            </span>
            <p className="text-secondary small">
              Delicious food ordering experience straight to your table. Professional customer care and top quality gourmet items.
            </p>
          </div>

          {/* Customer Support Links */}
          <div className="col-12 col-sm-6 col-md-3 text-start">
            <h6 className="text-white fw-bold mb-3">Customer Support</h6>
            <ul className="list-unstyled d-flex flex-column gap-2 small">
              <li><Link to="/help" className="text-secondary text-decoration-none hover-white">Help Center</Link></li>
              <li><Link to="/support" className="text-secondary text-decoration-none hover-white">Contact Support</Link></li>
              <li><Link to="/order-support" className="text-secondary text-decoration-none hover-white">Order Support</Link></li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="col-12 col-sm-6 col-md-3 text-start">
            <h6 className="text-white fw-bold mb-3">Contact Information</h6>
            <div className="d-flex flex-column gap-2 small text-secondary">
              <div>
                <strong className="text-white d-block small">Email</strong>
                <a href={`mailto:${restaurantInfo.email}`} className="text-secondary text-decoration-none hover-white">
                  {restaurantInfo.email}
                </a>
              </div>
              <div>
                <strong className="text-white d-block small">Phone</strong>
                <a href={`tel:${restaurantInfo.phone}`} className="text-secondary text-decoration-none hover-white">
                  {restaurantInfo.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Restaurant Address & Additional Info */}
          <div className="col-12 col-md-3 text-start">
            <h6 className="text-white fw-bold mb-3">Address</h6>
            <p className="text-secondary small mb-3">
              {restaurantInfo.address}
            </p>
            <h6 className="text-white fw-bold mb-2" style={{ fontSize: '12px' }}>Additional Links</h6>
            <div className="d-flex flex-wrap gap-2 small">
              <Link to="/about" className="text-secondary text-decoration-none hover-white">About Us</Link>
              <span className="text-secondary">|</span>
              <Link to="/privacy" className="text-secondary text-decoration-none hover-white">Privacy Policy</Link>
              <span className="text-secondary">|</span>
              <Link to="/terms" className="text-secondary text-decoration-none hover-white">Terms & Conditions</Link>
              <span className="text-secondary">|</span>
              <Link to="/refund" className="text-secondary text-decoration-none hover-white">Refund Policy</Link>
            </div>
          </div>
        </div>

        <hr className="my-4 border-secondary opacity-25" />

        <div className="row align-items-center justify-content-between g-2">
          <div className="col-12 col-sm-6 text-center text-sm-start">
            <p className="text-secondary small mb-0">
              © {new Date().getFullYear()} Foodie Inc. All rights reserved.
            </p>
          </div>
          <div className="col-12 col-sm-6 text-center text-sm-end">
            <span className="text-secondary small">
              Ordering App Powered by Foodie
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

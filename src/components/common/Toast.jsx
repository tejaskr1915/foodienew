import React, { useEffect } from 'react';
import { FiCheckCircle, FiTrash2 } from 'react-icons/fi';

export const Toast = ({ message, show, onClose, type = 'add', duration = 3000 }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const isRemove = type === 'remove';

  return (
    <div 
      className="position-fixed bottom-0 start-50 translate-middle-x mb-4 shadow-lg rounded-pill px-4 py-2.5 bg-dark text-white d-flex align-items-center gap-2"
      style={{ zIndex: 9999, transition: 'all 0.3s ease', fontSize: '14px' }}
    >
      {isRemove ? (
        <FiTrash2 className="text-danger" size={18} />
      ) : (
        <FiCheckCircle className="text-success" size={18} />
      )}
      <span className="fw-semibold">{message || (isRemove ? 'Item removed from cart' : 'Item added to cart')}</span>
    </div>
  );
};

export default Toast;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft } from 'react-icons/fi';

export const BackButton = ({ className = '', style = {}, onClick, to }) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button 
      type="button" 
      onClick={handleClick} 
      className={`btn btn-light rounded-circle p-2 border d-flex align-items-center justify-content-center ${className}`}
      style={{ width: '36px', height: '36px', ...style }}
      aria-label="Go back"
    >
      <FiChevronLeft size={20} />
    </button>
  );
};

export default BackButton;

import React from 'react';

export const CategoryCard = ({ category, isActive = false, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`d-inline-flex align-items-center px-4 py-2 cursor-pointer border rounded-pill fw-bold text-nowrap transition-all`}
      style={{ 
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backgroundColor: isActive ? 'var(--primary-color)' : '#fff',
        borderColor: isActive ? 'var(--primary-color)' : 'var(--border-color)',
        color: isActive ? '#fff' : 'var(--text-color)'
      }}
    >
      {category.icon && <span className="me-2">{category.icon}</span>}
      <span>{category.name}</span>
    </div>
  );
};

export default CategoryCard;

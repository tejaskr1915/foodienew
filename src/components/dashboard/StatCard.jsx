import React from 'react';

export const StatCard = ({
  title,
  value,
  icon: Icon,
  color = 'primary', // primary, success, danger, warning, info
  subtext,
  onClick
}) => {
  const getColors = () => {
    switch (color) {
      case 'success':
        return { bg: 'rgba(34, 165, 89, 0.1)', text: 'var(--success-color)' };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger-color)' };
      case 'warning':
        return { bg: 'rgba(242, 178, 51, 0.1)', text: 'var(--warning-color)' };
      case 'info':
        return { bg: 'rgba(51, 102, 221, 0.1)', text: 'var(--info-color)' };
      default:
        return { bg: 'var(--primary-light)', text: 'var(--primary-color)' };
    }
  };

  const colors = getColors();

  return (
    <div 
      className={`card rounded-3 border-0 shadow-sm p-4 bg-white h-100 ${onClick ? 'cursor-pointer hover-lift' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
    >
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <div className="text-secondary small fw-semibold d-block mb-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
            {typeof title === 'string' ? <span className="text-uppercase">{title}</span> : title}
          </div>
          <h3 className="fw-bold text-dark mt-2 mb-0">{value}</h3>
          {subtext && (
            <p className="text-secondary small mb-0 mt-1" style={{ fontSize: '10px' }}>
              {subtext}
            </p>
          )}
        </div>
        <div 
          className="rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '54px', height: '54px', backgroundColor: colors.bg, color: colors.text }}
        >
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};
export default StatCard;

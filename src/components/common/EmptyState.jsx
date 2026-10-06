import React from 'react';
import Button from './Button';

export const EmptyState = ({
  title,
  description,
  icon = 'bi-folder-x',
  buttonText,
  onButtonClick
}) => {
  return (
    <div className="text-center py-5 px-3">
      <div className="mb-3 text-secondary" style={{ fontSize: '48px' }}>
        <i className={`bi ${icon}`}></i>
      </div>
      <h5 className="fw-bold text-dark">{title}</h5>
      <p className="text-muted small mb-4">{description}</p>
      {buttonText && onButtonClick && (
        <Button onClick={onButtonClick} variant="primary">
          {buttonText}
        </Button>
      )}
    </div>
  );
};
export default EmptyState;

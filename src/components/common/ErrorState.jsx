import React from 'react';
import Button from './Button';

export const ErrorState = ({
  title = "Something went wrong",
  description = "An error occurred while loading data. Please try again.",
  onRetry
}) => {
  return (
    <div className="text-center py-5 px-3">
      <div className="mb-3 text-danger" style={{ fontSize: '48px' }}>
        <i className="bi bi-exclamation-triangle"></i>
      </div>
      <h5 className="fw-bold text-dark">{title}</h5>
      <p className="text-muted small mb-4">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="primary">
          Retry Request
        </Button>
      )}
    </div>
  );
};
export default ErrorState;

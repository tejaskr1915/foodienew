import React from 'react';

export const Loader = () => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3 text-muted fw-semibold" style={{ fontSize: '14px' }}>Loading deliciousness...</p>
    </div>
  );
};
export default Loader;

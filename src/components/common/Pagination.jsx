import React from 'react';

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className = ""
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className={`d-flex justify-content-center mt-4 ${className}`}>
      <ul className="pagination pagination-sm align-items-center gap-1 shadow-sm p-1.5 rounded-pill bg-white border mb-0">
        {currentPage > 1 && (
          <li className="page-item">
            <button 
              type="button"
              className="page-link rounded-pill border-0 px-3 py-1.5 text-danger fw-semibold" 
              onClick={() => onPageChange(currentPage - 1)}
            >
              Prev
            </button>
          </li>
        )}

        {pages.map((page) => (
          <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
            <button 
              type="button"
              className={`page-link rounded-circle border-0 px-2 py-1 fw-bold d-flex align-items-center justify-content-center ${currentPage === page ? 'bg-danger text-white shadow-sm' : 'text-dark bg-transparent'}`} 
              style={{ width: '32px', height: '32px', fontSize: '13px' }}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          </li>
        ))}

        {currentPage < totalPages && (
          <li className="page-item">
            <button 
              type="button"
              className="page-link rounded-pill border-0 px-3 py-1.5 text-danger fw-semibold" 
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};
export default Pagination;

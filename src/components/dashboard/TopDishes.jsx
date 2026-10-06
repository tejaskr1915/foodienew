import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../../utils/imageUtils';
import { FiAward } from 'react-icons/fi';

export const TopDishes = ({ dishes = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="card rounded-3 border-0 shadow-sm p-4 bg-white h-100">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h5 className="fw-bold text-dark mb-0">Top Selling Items</h5>
        <button
          onClick={() => navigate('/admin/menus')}
          className="btn btn-sm btn-link text-danger text-decoration-none fw-semibold p-0"
          style={{ fontSize: '12px' }}
        >
          View Menus
        </button>
      </div>
      
      {dishes.length === 0 ? (
        <div className="text-center py-4 text-secondary">
          <FiAward size={36} className="text-muted mb-2 opacity-50" />
          <p className="small mb-1 fw-semibold text-dark">No Top Dishes Yet</p>
          <p className="small text-muted mb-0" style={{ fontSize: '11.5px' }}>
            As customers place orders, popular and top-selling dishes will appear here.
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {dishes.map((dish) => (
            <div 
              key={dish.id} 
              onClick={() => navigate('/admin/menus')}
              className="d-flex align-items-center justify-content-between pb-2 border-bottom last-border-0 cursor-pointer"
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center gap-3">
                <div>
                  <div className="small fw-bold text-dark">{dish.name}</div>
                  <div className="text-secondary small mt-0.5" style={{ fontSize: '11px' }}>Popular Choice</div>
                </div>
              </div>
              <div className="text-end">
                <span className="badge bg-danger-subtle text-danger fw-bold rounded-pill px-2 py-1" style={{ fontSize: '11px' }}>
                  {dish.count} {dish.count === 1 ? 'order' : 'orders'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default TopDishes;

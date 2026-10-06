import React from 'react';
import Badge from '../common/Badge';
import { FiEdit2, FiTrash2, FiExternalLink } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export const MenuCard = ({
  menu,
  onEdit,
  onDelete,
  isAdmin = false
}) => {
  return (
    <div className="card rounded-3 border-0 shadow-sm p-4 bg-white foodie-card">
      <div className="d-flex align-items-start justify-content-between mb-3">
        <div>
          <h5 className="fw-bold text-dark mb-1">{menu.name}</h5>
          <p className="text-secondary small mb-2">{menu.description}</p>
          <span className="small text-muted fw-semibold">Dishes: {menu.dishCount}</span>
        </div>
        <Badge status={menu.status} />
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
        <Link 
          to={`/admin/menus/${menu.id}`} 
          className="btn btn-sm btn-light rounded-pill border d-inline-flex align-items-center gap-1 fw-bold text-dark px-3 py-1.5"
          style={{ fontSize: '12px' }}
        >
          <FiExternalLink />
          Menu Details
        </Link>

        {isAdmin && (
          <div className="d-flex gap-2">
            <button 
              onClick={onEdit} 
              className="btn btn-sm btn-outline-secondary rounded-circle p-2 border d-flex align-items-center justify-content-center"
              style={{ width: '32px', height: '32px' }}
            >
              <FiEdit2 size={14} />
            </button>
            <button 
              onClick={onDelete} 
              className="btn btn-sm btn-outline-danger rounded-circle p-2 border d-flex align-items-center justify-content-center"
              style={{ width: '32px', height: '32px' }}
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default MenuCard;

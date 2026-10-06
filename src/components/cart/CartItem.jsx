import React from 'react';
import QuantityControl from './QuantityControl';
import { getImageUrl } from '../../utils/imageUtils';

export const CartItem = ({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  const foodType = item.foodType || item.type || 'veg';
  const badgeClass = foodType === 'veg' ? 'veg-badge' : foodType === 'vegan' ? 'vegan-badge' : 'non-veg-badge';
  return (
    <div className="card rounded-3 p-3 mb-3 border border-light shadow-sm">
      <div className="row align-items-center">
        {/* Product image */}
        <div className="col-3 col-sm-2">
          <img 
            src={getImageUrl(item.image)} 
            alt={item.name} 
            className="img-fluid rounded" 
            style={{ width: '80px', height: '80px', objectFit: 'cover' }}
            onError={(event) => {
              console.error('Failed to load food image:', event.currentTarget.src);
              event.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';
            }}
          />
        </div>

        {/* Item Details */}
        <div className="col-9 col-sm-6">
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className={badgeClass}></span>
            <h6 className="fw-bold mb-0 text-dark text-truncate">{item.name}</h6>
          </div>
          <p className="text-muted small mb-0">₹{item.price} each</p>
        </div>

        {/* Quantity and Price */}
        <div className="col-12 col-sm-4 d-flex align-items-center justify-content-between mt-3 mt-sm-0">
          <QuantityControl 
            quantity={item.quantity}
            onIncrease={onIncrease}
            onDecrease={onDecrease}
          />
          <div className="d-flex align-items-center gap-3">
            <span className="fw-bold text-dark fs-5">₹{item.price * item.quantity}</span>
            <button 
              onClick={onRemove}
              className="btn btn-link text-danger p-0 border-0"
              aria-label="Remove item"
            >
              <i className="bi bi-trash3" style={{ fontSize: '18px' }}></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;

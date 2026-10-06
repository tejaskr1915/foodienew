import React from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import formatCurrency from '../../utils/formatCurrency';
import { getImageUrl } from '../../utils/imageUtils';

export const DishCard = ({
  dish,
  onEdit,
  onDelete,
  isAdmin = false
}) => {
  const foodType = dish.foodType || dish.type || 'veg';

  const baseOriginalPrice = parseFloat(dish.originalPrice || dish.price || 0);
  const discPct = parseFloat(dish.discountPercent || dish.discount_percent || dish.offer_percentage || dish.discount || 0);
  const discPriceProp = parseFloat(dish.discountPrice || dish.discount_price || dish.sellingPrice || 0);

  let oldPrice = baseOriginalPrice;
  let finalPrice = baseOriginalPrice;
  let hasDiscount = Boolean(dish.hasDiscount);
  let calculatedPct = discPct;

  if (discPriceProp > 0 && discPriceProp < baseOriginalPrice) {
    hasDiscount = true;
    finalPrice = discPriceProp;
    if (!calculatedPct) {
      calculatedPct = Math.round(((baseOriginalPrice - discPriceProp) / baseOriginalPrice) * 100);
    }
  } else if (discPct > 0 && discPct < 100) {
    hasDiscount = true;
    finalPrice = Math.round(baseOriginalPrice * (1 - discPct / 100));
  }

  const discountLabel = calculatedPct > 0 ? `${calculatedPct}% OFF` : `OFFER AVAILABLE`;

  const isOutOfStock = (dish.stock !== undefined && dish.stock <= 0) || dish.status === 'Out of Stock' || dish.status === 'OUT_OF_STOCK' || dish.is_available === false;

  return (
    <div className="card rounded-3 border-0 shadow-sm overflow-hidden bg-white foodie-card h-100 d-flex flex-column justify-content-between">
      <div>
        <div className="position-relative" style={{ height: '180px' }}>
          <img 
            src={getImageUrl(dish.image)} 
            alt={dish.name} 
            className="w-100 h-100" 
            style={{ 
              objectFit: 'cover',
              filter: isOutOfStock ? 'grayscale(100%) opacity(0.8)' : 'none'
            }}
            onError={(event) => {
              console.warn('Food image failed to load, applying fallback:', event.currentTarget.src);
              event.currentTarget.onerror = null;
              event.currentTarget.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80';
            }}
          />

          {/* OUT OF STOCK Badge Overlay */}
          {isOutOfStock && (
            <div className="position-absolute top-50 start-50 translate-middle text-center w-100 px-2" style={{ zIndex: 2 }}>
              <span className="badge bg-dark text-white fw-bold px-3 py-1.5 shadow-sm rounded-pill border border-secondary d-inline-block mb-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                OUT OF STOCK
              </span>
              <div className="small text-white fw-semibold" style={{ fontSize: '10px', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                Will be available soon
              </div>
            </div>
          )}

          {/* Offer Tag Badge overlay (top-left) */}
          {!isOutOfStock && hasDiscount && (
            <div className="position-absolute top-0 start-0 m-2" style={{ zIndex: 2 }}>
              <span className="badge bg-danger text-white fw-bold px-2 py-1 shadow-sm rounded-pill d-inline-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                🔥 {discountLabel}
              </span>
            </div>
          )}

          {/* Veg/Non-Veg Tag (top-right) */}
          <div className="position-absolute top-0 end-0 m-2 bg-white p-1 rounded-3 shadow-sm d-flex align-items-center justify-content-center" style={{ zIndex: 2, minWidth: '24px', minHeight: '24px' }}>
            <span className={foodType === 'veg' ? 'veg-badge' : foodType === 'vegan' ? 'vegan-badge' : 'non-veg-badge'} style={{ margin: 0 }}></span>
          </div>
        </div>

        <div className="p-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="badge bg-light text-danger border border-danger-subtle fw-bold rounded-pill px-2.5 py-1" style={{ fontSize: '11px' }}>
              {dish.category}
            </span>
          </div>

          <h6 className="fw-bold text-dark mb-1">{dish.name}</h6>
          <p className="text-secondary small text-truncate mb-2" style={{ maxHeight: '40px' }}>
            {dish.description}
          </p>
        </div>
      </div>

      <div className="p-3 pt-0">
        <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top border-light-subtle">
          <div>
            {hasDiscount ? (
              <div className="d-flex flex-column align-items-start">
                <div className="d-flex align-items-baseline gap-1.5 flex-wrap">
                  <span className="text-decoration-line-through text-danger opacity-75 small me-1" style={{ fontSize: '11px' }}>
                    {formatCurrency(oldPrice)}
                  </span>
                  <span className="fw-bold text-dark fs-6">
                    {formatCurrency(finalPrice)}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-1 mt-0.5">
                  <span className="badge bg-danger-subtle text-danger fw-bold rounded px-1.5 py-0.5" style={{ fontSize: '9px' }}>
                    {discountLabel}
                  </span>
                  <span className="small text-muted" style={{ fontSize: '10px' }}>• Stock: {dish.stock}</span>
                </div>
              </div>
            ) : (
              <div>
                <h5 className="fw-bold text-danger mb-0">{formatCurrency(dish.price)}</h5>
                <span className="small text-muted" style={{ fontSize: '10px' }}>Stock: {dish.stock}</span>
              </div>
            )}
          </div>
          
          {isAdmin && (
            <div className="d-flex gap-2">
              <button 
                onClick={onEdit} 
                className="btn btn-sm btn-outline-secondary rounded-circle p-2 border d-flex align-items-center justify-content-center"
                style={{ width: '32px', height: '32px' }}
                title="Edit Dish"
              >
                <FiEdit2 size={14} />
              </button>
              <button 
                onClick={onDelete} 
                className="btn btn-sm btn-outline-danger rounded-circle p-2 border d-flex align-items-center justify-content-center"
                style={{ width: '32px', height: '32px' }}
                title="Delete Dish"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default DishCard;

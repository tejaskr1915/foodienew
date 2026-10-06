import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { getImageUrl } from '../../utils/imageUtils';

export const FoodCard = ({ food }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  const foodType = food.foodType || food.type || 'veg';
  const badgeClass = foodType === 'veg' ? 'veg-badge' : foodType === 'vegan' ? 'vegan-badge' : 'non-veg-badge';

  const baseOriginalPrice = parseFloat(food.originalPrice || food.price || 0);
  const discPct = parseFloat(food.discountPercent || food.discount_percent || food.offer_percentage || food.discount || 0);
  const discPriceProp = parseFloat(food.discountPrice || food.discount_price || food.sellingPrice || 0);

  let oldPrice = baseOriginalPrice;
  let finalPrice = baseOriginalPrice;
  let hasDiscount = false;
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

  const isOutOfStock = food.stock <= 0 || food.status === 'Out of Stock' || food.status === 'OUT_OF_STOCK' || food.is_available === false;

  const handleCardClick = () => {
    navigate(`/food/${food.id}`);
  };

  const handleAddClick = async (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    const success = await addToCart(food, 1);
    if (success) {
      alert(`${food.name} added to cart!`);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`card premium-card h-100 border-0 shadow-sm cursor-pointer position-relative d-flex flex-column ${isOutOfStock ? 'opacity-90' : ''}`}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
        <img 
          src={getImageUrl(food.image)} 
          className="card-img-top w-100 h-100" 
          alt={food.name}
          style={{ 
            objectFit: 'cover',
            filter: isOutOfStock ? 'grayscale(100%) opacity(0.8)' : 'none'
          }}
          onError={(event) => {
            console.error('Failed to load food image:', event.currentTarget.src);
            event.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
          }}
        />

        {/* OUT OF STOCK Badge Overlay */}
        {isOutOfStock && (
          <div className="position-absolute top-50 start-50 translate-middle text-center w-100 px-2 z-3">
            <span className="badge bg-dark text-white fw-bold px-3 py-1.5 shadow-sm rounded-pill border border-secondary d-inline-block mb-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
              OUT OF STOCK
            </span>
            <div className="small text-white fw-semibold" style={{ fontSize: '10.5px', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
              Will be available soon
            </div>
          </div>
        )}

        {/* Offer Tag Badge overlay (top-left) */}
        {!isOutOfStock && hasDiscount && (
          <div className="position-absolute top-0 start-0 m-2 z-3">
            <span className="badge bg-danger text-white fw-bold px-2 py-1 shadow-sm rounded-pill d-inline-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
              🔥 {discountLabel}
            </span>
          </div>
        )}

        {/* Veg/Non-veg/Vegan overlay badge (top-right) */}
        <div 
          className="position-absolute top-0 end-0 m-2 z-3 bg-white p-1 rounded-3 shadow-sm d-flex align-items-center justify-content-center"
          style={{ minWidth: '24px', minHeight: '24px' }}
        >
          <span className={badgeClass} style={{ margin: 0 }}></span>
        </div>
      </div>

      <div className="card-body p-3 d-flex flex-column justify-content-between flex-grow-1">
        <div>
          <h5 className="card-title fw-bold mb-1 text-dark text-truncate">{food.name}</h5>
          <p className="card-text text-muted small mb-3 text-truncate-2" style={{ height: '40px', overflow: 'hidden' }}>
            {food.description}
          </p>
        </div>
        
        <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top border-light">
          {hasDiscount ? (
            <div className="d-flex flex-column align-items-start">
              <div className="d-flex align-items-baseline gap-1.5 flex-wrap">
                <span className="text-decoration-line-through text-danger opacity-75 small me-1" style={{ fontSize: '11px' }}>
                  ₹{oldPrice}
                </span>
                <span className="fs-5 fw-extrabold text-dark fw-bold">₹{finalPrice}</span>
              </div>
            </div>
          ) : (
            <span className="fs-5 fw-extrabold text-dark fw-bold">₹{food.price}</span>
          )}
          {isOutOfStock ? (
            <div className="text-end">
              <button 
                disabled
                onClick={(e) => e.stopPropagation()}
                className="btn btn-secondary btn-sm rounded-pill px-3 fw-bold opacity-75"
                style={{ cursor: 'not-allowed', fontSize: '11px' }}
              >
                Out of Stock
              </button>
              <div className="text-muted small mt-0.5" style={{ fontSize: '9px' }}>
                Will be available soon
              </div>
            </div>
          ) : (
            <button 
              onClick={handleAddClick} 
              className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
              style={{ 
                color: 'var(--primary-color)',
                borderColor: 'var(--primary-color)',
                transition: 'all 0.2s ease'
              }}
            >
              Add
              <i className="bi bi-plus-lg"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodCard;

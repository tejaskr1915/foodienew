import React from 'react';
import formatCurrency from '../../utils/formatCurrency';
import { useCart } from '../../hooks/useCart';
import { FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import QuantityControl from './QuantityControl';
import { getProductSellingPrice } from '../../utils/pricing';
import { getImageUrl } from '../../utils/imageUtils';

export const FoodCard = ({ dish }) => {
  const navigate = useNavigate();
  const { cartItems, addToCart, increaseQuantity, decreaseQuantity, updateQuantity, showOutOfStockModal } = useCart();
  const cartItem = cartItems.find((item) => Number(item.id) === Number(dish.id));
  const quantityInCart = cartItem ? cartItem.quantity : 0;
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

  const isOutOfStock = dish.stock <= 0 || dish.status === 'Out of Stock' || dish.status === 'OUT_OF_STOCK' || dish.is_available === false;

  const isPopular = Boolean(
    dish.isPopular ||
    dish.isTopSelling ||
    dish.popular ||
    (dish.orderCount && dish.orderCount > 0) ||
    (() => {
      try {
        const topIds = JSON.parse(localStorage.getItem('foodie_top_selling_ids') || '[]');
        return topIds.includes(Number(dish.id));
      } catch (e) {
        return false;
      }
    })()
  );

  const handleCardClick = () => {
    navigate(`/customer/food/${dish.id}`);
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const maxStock = typeof dish.stock === 'number' ? dish.stock : 20;
    if (isOutOfStock || maxStock <= 0) {
      if (showOutOfStockModal) {
        showOutOfStockModal({
          item: dish,
          stock: 0,
          message: `Sorry, "${dish.name}" is completely out of stock and cannot be added right now.`
        });
      }
      return;
    }
    if (quantityInCart >= maxStock) {
      if (showOutOfStockModal) {
        showOutOfStockModal({
          item: dish,
          stock: maxStock,
          message: `You have reached the maximum available quantity (${maxStock} in stock) for "${dish.name}". Additional quantity is out of stock.`
        });
      }
      return;
    }
    addToCart(dish, 1);
  };

  const handleOutOfStockClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (showOutOfStockModal) {
      showOutOfStockModal({
        item: dish,
        stock: 0,
        message: `Sorry, "${dish.name}" is currently out of stock and will be freshly prepared soon.`
      });
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`card h-100 rounded-4 border-0 shadow-sm overflow-hidden bg-white foodie-card position-relative d-flex flex-column cursor-pointer ${isOutOfStock ? 'opacity-90' : ''}`}
      style={{ cursor: 'pointer' }}
    >
      {/* Top Image area with overlays */}
      <div className="position-relative" style={{ height: '160px' }}>
        <img
          src={getImageUrl(dish.image)}
          alt={dish.name}
          className="w-100 h-100"
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
          <div className="position-absolute top-50 start-50 translate-middle text-center w-100 px-2" style={{ zIndex: 2 }}>
            <span className="badge bg-dark text-white fw-bold px-3 py-1.5 shadow-sm rounded-pill border border-secondary d-inline-block mb-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
              OUT OF STOCK
            </span>
            <div className="small text-white fw-semibold" style={{ fontSize: '10.5px', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
              Will be available soon
            </div>
          </div>
        )}

        {/* Offer Tag overlay (top-left) */}
        {!isOutOfStock && hasDiscount && (
          <div className="position-absolute top-0 start-0 m-2 d-flex flex-column gap-1 align-items-start" style={{ zIndex: 2 }}>
            <span className="badge bg-danger text-white fw-bold px-2 py-1 shadow-sm rounded-pill d-inline-flex align-items-center gap-1" style={{ fontSize: '10px', letterSpacing: '0.3px' }}>
              🔥 {discountLabel}
            </span>
          </div>
        )}

        {/* Veg/Non-veg overlay badge (top-right) */}
        <div
          className="position-absolute top-0 end-0 m-2 bg-white p-1 rounded-3 shadow-sm d-flex align-items-center justify-content-center"
          style={{ zIndex: 2, minWidth: '24px', minHeight: '24px' }}
        >
          <span 
            className={foodType === 'veg' ? 'veg-badge' : foodType === 'vegan' ? 'vegan-badge' : 'non-veg-badge'}
            style={{ margin: 0 }}
          ></span>
        </div>
      </div>

      {/* Content area below image */}
      <div className="p-3 d-flex flex-column justify-content-between flex-grow-1">
        <div className="mb-2">
          <div className="d-flex align-items-center gap-2 mb-1">
            <h6 className="fw-bold text-dark mb-0 text-truncate" title={dish.name}>{dish.name}</h6>
            {isPopular && (
              <span 
                className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-0.5 ms-2 d-inline-flex align-items-center gap-1 flex-shrink-0"
                style={{ fontSize: '10px', fontWeight: '700' }}
                title="Popular item ordered frequently"
              >
                ⭐ Popular
              </span>
            )}
          </div>
          <p className="text-secondary small mb-0" style={{ fontSize: '11px', lineHeight: '1.4', height: '30px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {dish.description}
          </p>
        </div>

        {/* Action Row */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="d-flex align-items-center justify-content-between pt-2 border-top border-light mt-auto"
        >
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
              <span className="badge bg-danger-subtle text-danger fw-bold rounded px-1.5 py-0.5 mt-0.5" style={{ fontSize: '9px' }}>
                {discountLabel}
              </span>
            </div>
          ) : (
            <span className="fw-bold text-dark fs-6">{formatCurrency(dish.price)}</span>
          )}

          {isOutOfStock ? (
            <div className="text-end">
              <button
                type="button"
                onClick={handleOutOfStockClick}
                className="btn btn-sm btn-secondary rounded-pill px-3 py-1 fw-bold opacity-75"
                style={{ fontSize: '11px', cursor: 'pointer' }}
                title="Click to view out of stock details"
              >
                Out of Stock
              </button>
              <div className="text-muted small mt-0.5" style={{ fontSize: '9px' }}>
                Will be available soon
              </div>
            </div>
          ) : quantityInCart > 0 ? (
            <div onClick={(e) => e.stopPropagation()}>
              <QuantityControl
                quantity={quantityInCart}
                min={0}
                max={dish.stock}
                onIncrease={() => increaseQuantity(dish.id)}
                onDecrease={() => decreaseQuantity(dish.id)}
                onChange={(val) => updateQuantity(dish.id, val)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleQuickAdd}
              className="btn btn-sm btn-outline-danger food-card-add-btn rounded-pill px-3 py-1 fw-bold"
              style={{ fontSize: '11px' }}
            >
              Add +
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodCard;

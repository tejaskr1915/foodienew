import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { FiChevronRight } from 'react-icons/fi';
import { getImageUrl } from '../../utils/imageUtils';
import formatCurrency from '../../utils/formatCurrency';

export const MobileFloatingCartBar = () => {
  const { cartItems, getSubtotal } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Hidden on checkout, payment, order confirmation or tracking pages
  const hiddenRoutes = [
    '/customer/cart',
    '/customer/checkout',
    '/customer/payment',
    '/customer/order-confirmation',
    '/customer/order-tracking'
  ];

  const isHiddenRoute = hiddenRoutes.some(route => location.pathname.startsWith(route));

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = getSubtotal();

  if (isHiddenRoute || totalQuantity === 0) {
    return null;
  }

  const lastAddedItem = cartItems[cartItems.length - 1];
  const targetSpendForOffer = 300;
  const amountNeeded = Math.max(0, targetSpendForOffer - subtotal);
  const isOfferUnlocked = subtotal >= targetSpendForOffer;

  return (
    <div 
      className="d-md-none position-fixed start-0 end-0"
      style={{
        bottom: '10px',
        zIndex: 1060,
        padding: '0 12px',
        maxWidth: '480px',
        margin: '0 auto',
        boxSizing: 'border-box',
        animation: 'slideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div 
        className="rounded-4 overflow-hidden shadow-lg border w-100"
        style={{
          backgroundColor: '#ffffff',
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* Top Promo Banner (Unlock 60% OFF) */}
        <div 
          className="d-flex align-items-center justify-content-between px-3.5 py-2.5"
          style={{
            background: 'linear-gradient(180deg, #f8faff 0%, #ffffff 100%)',
            borderBottom: '1px solid #edf2f7'
          }}
        >
          <div className="d-flex align-items-center gap-3 flex-grow-1 min-w-0 me-2">
            {/* Blue % Circle with Progress Ring */}
            <div 
              className="d-flex align-items-center justify-content-center fw-bold shadow-xs flex-shrink-0"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: '2px solid #2563eb',
                backgroundColor: '#ffffff',
                color: '#2563eb',
                fontSize: '13px'
              }}
            >
              %
            </div>
            <div className="text-start min-w-0">
              <div className="fw-bold text-dark text-truncate" style={{ fontSize: '12.5px', lineHeight: '1.3' }}>
                Unlock 60% OFF up to ₹100
              </div>
              <div className="text-secondary text-truncate" style={{ fontSize: '11px', marginTop: '2px', lineHeight: '1.2' }}>
                {isOfferUnlocked ? (
                  <span className="text-success fw-semibold">🎉 Offer unlocked! Extra savings applied</span>
                ) : (
                  <span>Add items worth <strong className="text-dark">₹{amountNeeded}</strong> more to unlock</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Red Rounded Option Bar */}
        <div className="p-2 pt-1.5 bg-white">
          <div 
            onClick={() => navigate('/customer/cart')}
            className="d-flex align-items-center justify-content-between px-3.5 py-2.5 rounded-3 shadow-sm cursor-pointer transition-all"
            style={{
              backgroundColor: 'var(--primary-color, #e23744)',
              background: 'linear-gradient(135deg, #e23744 0%, #cb202d 100%)',
              cursor: 'pointer',
              borderRadius: '12px'
            }}
          >
            {/* Left: Thumbnail & Count with neat spacing */}
            <div className="d-flex align-items-center min-w-0" style={{ gap: '14px' }}>
              {lastAddedItem?.image && (
                <img 
                  src={getImageUrl(lastAddedItem.image)} 
                  alt={lastAddedItem.name || 'Dish'} 
                  className="rounded-2 flex-shrink-0"
                  style={{
                    width: '36px',
                    height: '36px',
                    objectFit: 'cover',
                    border: '1.5px solid rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
                  }}
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';
                  }}
                />
              )}
              <div className="text-white text-start text-truncate" style={{ paddingLeft: '4px' }}>
                <span className="fw-bold" style={{ fontSize: '13.5px', letterSpacing: '0.2px' }}>
                  {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} added
                </span>
                <span className="opacity-90 fw-semibold" style={{ fontSize: '12.5px', marginLeft: '8px' }}>
                  • {formatCurrency(subtotal)}
                </span>
              </div>
            </div>

            {/* Right: Continue */}
            <div className="d-flex align-items-center gap-1.5 text-white fw-bold flex-shrink-0 ms-2" style={{ fontSize: '14px' }}>
              <span>Continue</span>
              <FiChevronRight size={17} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileFloatingCartBar;

import React from 'react';
import { FiAlertCircle, FiPackage } from 'react-icons/fi';
import Button from './Button';
import { getImageUrl } from '../../utils/imageUtils';

export const OutOfStockModal = ({
  isOpen,
  onClose,
  item,
  message,
  stock
}) => {
  if (!isOpen) return null;

  const itemName = item?.name || 'This item';
  const itemImg = item?.image ? getImageUrl(item.image) : null;
  const currentStock = stock !== undefined ? stock : (item?.stock !== undefined ? item.stock : 0);

  return (
    <div 
      className="modal fade show d-block" 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 1060, backdropFilter: 'blur(4px)' }} 
      tabIndex="-1"
      onClick={onClose}
    >
      <div 
        className="modal-dialog modal-dialog-centered" 
        style={{ maxWidth: '420px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden bg-white p-0 animate-fade-in">
          {/* Header Bar */}
          <div className="d-flex align-items-center justify-content-between px-4 pt-4 pb-2">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-danger-subtle text-danger p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                <FiAlertCircle size={20} />
              </div>
              <h5 className="modal-title fw-bold text-dark mb-0">Out of Stock</h5>
            </div>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose} 
              aria-label="Close"
            ></button>
          </div>

          {/* Body Content */}
          <div className="modal-body px-4 py-3 text-center">
            {itemImg && (
              <div className="position-relative mx-auto mb-3" style={{ width: '84px', height: '84px' }}>
                <img
                  src={itemImg}
                  alt={itemName}
                  className="rounded-4 w-100 h-100 shadow-sm"
                  style={{ objectFit: 'cover', filter: 'grayscale(50%)' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="position-absolute top-0 start-100 translate-middle badge bg-dark text-white rounded-pill px-2 py-1 shadow-sm" style={{ fontSize: '9px' }}>
                  {currentStock > 0 ? `Max: ${currentStock}` : '0 left'}
                </span>
              </div>
            )}

            <h6 className="fw-bold text-dark mb-2">{itemName}</h6>

            <p className="text-secondary small mb-3" style={{ lineHeight: '1.5', fontSize: '13px' }}>
              {message || (
                currentStock > 0
                  ? `You have reached the maximum available quantity (${currentStock} in stock) for this dish. Additional quantity is currently out of stock.`
                  : `Sorry, this item is completely out of stock and cannot be added right now.`
              )}
            </p>

            <div className="p-2.5 rounded-3 bg-light border border-light-subtle text-muted small mb-1" style={{ fontSize: '11.5px' }}>
              <FiPackage className="me-1 text-danger" /> 
              {currentStock > 0 ? `Available stock: ${currentStock} units` : 'Will be freshly prepared soon'}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer border-top-0 px-4 pb-4 pt-1 d-flex justify-content-center">
            <Button 
              onClick={onClose} 
              variant="primary" 
              className="w-100 py-2.5 fw-bold rounded-pill"
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutOfStockModal;

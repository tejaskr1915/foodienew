import React from 'react';
import Modal from '../common/Modal';
import { FiShoppingBag, FiCoffee } from 'react-icons/fi';

export const OrderTypeModal = ({ isOpen, onSelectType }) => {
  if (!isOpen) return null;

  const handleSelect = (type) => {
    onSelectType(type);
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Choose How You'd Like to Order"
      onClose={() => {}}
      size="md"
    >
      <div className="py-2 text-center">
        <p className="text-secondary small mb-4">
          Please select your order preference to customize your menu experience.
        </p>

        <div className="row g-3">
          <div className="col-6">
            <button
              type="button"
              className="btn btn-outline-danger w-100 p-4 rounded-4 d-flex flex-column align-items-center justify-content-center gap-2 border-2 dining-option-card"
              onClick={() => handleSelect('DINE_IN')}
              style={{ minHeight: '140px' }}
            >
              <div className="dining-option-icon rounded-circle p-2 mb-1 d-flex align-items-center justify-content-center">
                <FiCoffee size={36} className="text-danger" />
              </div>
              <span className="fw-bold fs-6">Table Dine-In</span>
              <span className="text-muted" style={{ fontSize: '11px' }}>Food served at your table</span>
            </button>
          </div>

          <div className="col-6">
            <button
              type="button"
              className="btn btn-outline-danger w-100 p-4 rounded-4 d-flex flex-column align-items-center justify-content-center gap-2 border-2 dining-option-card"
              onClick={() => handleSelect('TAKEAWAY')}
              style={{ minHeight: '140px' }}
            >
              <div className="dining-option-icon rounded-circle p-2 mb-1 d-flex align-items-center justify-content-center">
                <FiShoppingBag size={36} className="text-danger" />
              </div>
              <span className="fw-bold fs-6">Takeaway / Pick Up</span>
              <span className="text-muted" style={{ fontSize: '11px' }}>Pick up order at counter</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OrderTypeModal;

import React, { useState } from 'react';
import formatCurrency from '../../utils/formatCurrency';
import QuantityControl from './QuantityControl';
import { FiTrash2 } from 'react-icons/fi';
import { getProductSellingPrice } from '../../utils/pricing';
import { getImageUrl } from '../../utils/imageUtils';
import { normalizeFoodType } from '../../utils/filters';

export const CartItem = ({
  item,
  onIncrease,
  onDecrease,
  onChange,
  onRemove,
  onUpdateInstructions
}) => {
  const [showEdit, setShowEdit] = useState(false);
  const [instructionText, setInstructionText] = useState(item.instructions || '');
  const [selectedExtras, setSelectedExtras] = useState(item.extraIngredients || []);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    if (isRemoving) return;
    setIsRemoving(true);
    try {
      await onRemove();
    } finally {
      setIsRemoving(false);
    }
  };

  const foodType = normalizeFoodType(item.foodType || item.type || (item.is_veg === false || item.is_veg === 'false' ? 'non-veg' : 'veg'));

  return (
    <div className="card rounded-3 border-0 shadow-sm p-3 mb-3 bg-white d-flex flex-row align-items-center gap-3">
      <img 
        src={getImageUrl(item.image)} 
        alt={item.name} 
        className="rounded-3" 
        style={{ width: '70px', height: '70px', objectFit: 'cover', flexShrink: 0 }}
        onError={(event) => {
          console.error('Failed to load food image:', event.currentTarget.src);
          event.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';
        }}
      />
      
      <div className="flex-grow-1 min-width-0 d-flex flex-column gap-2">
        {/* Name and Trash Icon Row */}
        <div className="d-flex align-items-start justify-content-between gap-2">
          <h6 className="fw-bold text-dark text-truncate mb-0 d-flex align-items-center gap-2" style={{ fontSize: '14px' }}>
            <span className={foodType === 'veg' ? 'veg-badge' : foodType === 'vegan' ? 'vegan-badge' : 'non-veg-badge'}></span>
            {item.name}
          </h6>
          <button 
            onClick={handleRemove}
            disabled={isRemoving}
            className="btn btn-sm btn-outline-light border-0 text-danger p-1 d-flex align-items-center justify-content-center"
            style={{ width: '28px', height: '28px', flexShrink: 0, opacity: isRemoving ? 0.5 : 1 }}
          >
            <FiTrash2 size={16} />
          </button>
        </div>
        
        {/* Price and Quantity Control Row */}
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <div className="d-flex align-items-center gap-1.5 flex-wrap">
            {item.hasDiscount || item.discountPercent > 0 || (item.discountPrice > 0 && item.discountPrice < item.price) ? (
              <>
                <span className="text-decoration-line-through text-muted small" style={{ fontSize: '11px' }}>
                  {formatCurrency(item.price)}
                </span>
                <span className="fw-bold text-danger" style={{ fontSize: '14px' }}>
                  {formatCurrency(getProductSellingPrice(item))}
                </span>
              </>
            ) : (
              <span className="fw-bold text-danger" style={{ fontSize: '14px' }}>
                {formatCurrency(item.price)}
              </span>
            )}
          </div>
          <QuantityControl 
            quantity={item.quantity}
            max={item.stock}
            onIncrease={onIncrease}
            onDecrease={onDecrease}
            onChange={onChange}
          />
        </div>

        {/* Special Instructions Section */}
        <div className="mt-2 pt-2 border-top border-light-subtle">
          {(item.instructions || (item.extraIngredients && item.extraIngredients.length > 0)) ? (
            <div className="d-flex flex-column text-start gap-1">
              {item.instructions && (
                <span className="text-secondary" style={{ fontSize: '11px' }}>
                  <strong className="text-dark">Instructions:</strong> {item.instructions}
                </span>
              )}
              {item.extraIngredients && item.extraIngredients.length > 0 && (
                <span className="text-secondary" style={{ fontSize: '11px' }}>
                  <strong className="text-dark">Add-ons:</strong> {item.extraIngredients.map(ing => `${ing.name} (+₹${ing.price})`).join(', ')}
                </span>
              )}
              <div className="d-flex gap-2 mt-0.5">
                <button 
                  type="button" 
                  onClick={() => {
                    setInstructionText(item.instructions || '');
                    setSelectedExtras(item.extraIngredients || []);
                    setShowEdit(true);
                  }} 
                  className="btn btn-sm btn-link text-danger p-0 fw-semibold text-decoration-none" 
                  style={{ fontSize: '11px' }}
                >
                  Edit
                </button>
                <span className="text-muted" style={{ fontSize: '11px' }}>|</span>
                <button 
                  type="button" 
                  onClick={() => {
                    onUpdateInstructions(item.id, "", []);
                    setInstructionText("");
                    setSelectedExtras([]);
                  }} 
                  className="btn btn-sm btn-link text-secondary p-0 fw-semibold text-decoration-none" 
                  style={{ fontSize: '11px' }}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            !showEdit && (
              <button 
                type="button" 
                onClick={() => {
                  setInstructionText("");
                  setSelectedExtras([]);
                  setShowEdit(true);
                }} 
                className="btn btn-sm btn-link text-danger p-0 fw-semibold text-decoration-none d-flex align-items-center gap-1"
                style={{ fontSize: '11px' }}
              >
                + Add Instructions & Toppings
              </button>
            )
          )}

          {showEdit && (
            <div className="mt-3 p-3 rounded-3 bg-light border text-start">
              {/* Default instruction pills */}
              <label className="small fw-bold text-dark d-block mb-1.5" style={{ fontSize: '11px' }}>Select Preparation Note</label>
              <div className="d-flex flex-wrap gap-1.5 mb-3">
                {[
                  'Less Spicy', 'Extra Spicy', 'No Onion', 'No Garlic',
                  'Less Salt', 'No Cheese', 'Well Cooked', 'Serve Hot'
                ].map(inst => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => {
                      setInstructionText(prev => {
                        const trimmed = prev.trim();
                        if (!trimmed) return inst;
                        const regex = new RegExp(`(^|,\\s*)${inst}(,\\s*|$)`, 'i');
                        if (regex.test(trimmed)) {
                          return trimmed.replace(regex, '$2').replace(/^,\s*/, '').replace(/,\s*$/, '');
                        }
                        return `${trimmed}, ${inst}`;
                      });
                    }}
                    className={`btn btn-sm rounded-pill py-0.5 px-2.5 transition-all text-nowrap hover-bg-light-red ${
                      new RegExp(`(^|,\\s*)${inst}(,\\s*|$)`, 'i').test(instructionText)
                        ? 'btn-danger text-white border-danger'
                        : 'btn-outline-secondary'
                    }`}
                    style={{ fontSize: '9px', fontWeight: '500' }}
                  >
                    {inst}
                  </button>
                ))}
              </div>

              {/* Custom instructions input */}
              <input
                type="text"
                className="form-control form-control-sm mb-3"
                placeholder="Or enter custom instructions..."
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                style={{ fontSize: '12px' }}
              />

              {/* Extra toppings list */}
              <label className="small fw-bold text-dark d-block mb-1.5" style={{ fontSize: '11px' }}>Add Extra Ingredients & Toppings</label>
              <div className="d-flex flex-column gap-2 mb-3 p-2.5 rounded-3 border" style={{ backgroundColor: '#f8fafc' }}>
                {[
                  { name: 'Extra Cheese', price: 30 },
                  { name: 'Extra Paneer', price: 50 },
                  { name: 'Extra Sauce', price: 20 }
                ].map(addon => {
                  const isChecked = selectedExtras.some(ing => ing.name === addon.name);
                  return (
                    <label
                      key={addon.name}
                      className="d-flex align-items-center justify-content-between cursor-pointer mb-0 p-2 rounded-2 transition-all"
                      style={{
                        backgroundColor: isChecked ? '#fff1f2' : '#ffffff',
                        border: isChecked ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedExtras(prev => 
                              isChecked 
                                ? prev.filter(ing => ing.name !== addon.name)
                                : [...prev, addon]
                            );
                          }}
                          className="form-check-input mt-0"
                          style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                        />
                        <span className="small fw-semibold" style={{ fontSize: '11.5px', color: isChecked ? '#991b1b' : '#334155' }}>
                          {addon.name}
                        </span>
                      </div>
                      <span className="badge rounded-pill fw-bold" style={{ backgroundColor: isChecked ? '#fee2e2' : '#f1f5f9', color: isChecked ? '#dc2626' : '#64748b', fontSize: '10.5px' }}>
                        + ₹{addon.price}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Pricing breakdown */}
              {(() => {
                const basePrice = getProductSellingPrice(item);
                const extraCharges = selectedExtras.reduce((sum, ing) => sum + ing.price, 0);
                const totalUnit = basePrice + extraCharges;
                return (
                  <div className="bg-white p-2.5 rounded-3 border mb-3">
                    <div className="d-flex justify-content-between text-secondary" style={{ fontSize: '10px' }}>
                      <span>Base Price:</span>
                      <span>₹{basePrice}</span>
                    </div>
                    {extraCharges > 0 && (
                      <div className="d-flex justify-content-between text-secondary mt-0.5" style={{ fontSize: '10px' }}>
                        <span>Add-on Charges:</span>
                        <span className="text-danger">+ ₹{extraCharges}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between fw-bold text-dark border-top pt-1 mt-1" style={{ fontSize: '11.5px' }}>
                      <span>Unit Total:</span>
                      <span className="text-danger">₹{totalUnit}</span>
                    </div>
                    <div className="d-flex justify-content-between text-secondary mt-0.5" style={{ fontSize: '10px' }}>
                      <span>Item Subtotal ({item.quantity}x):</span>
                      <span>₹{totalUnit * item.quantity}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="d-flex justify-content-end gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEdit(false);
                    setInstructionText(item.instructions || '');
                    setSelectedExtras(item.extraIngredients || []);
                  }} 
                  className="btn btn-sm btn-light border py-1.5 px-3 fw-bold" 
                  style={{ fontSize: '11px' }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    onUpdateInstructions(item.id, instructionText, selectedExtras);
                    setShowEdit(false);
                  }} 
                  className="btn btn-sm btn-danger py-1.5 px-3 text-white fw-bold" 
                  style={{ fontSize: '11px' }}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CartItem;

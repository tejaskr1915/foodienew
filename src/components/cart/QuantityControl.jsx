import React, { useState, useRef, useEffect } from 'react';

/**
 * Cart QuantityControl with Touch & Keyboard support
 */
export const QuantityControl = ({
  quantity,
  onIncrease,
  onDecrease,
  onChange,
  max,
  min = 1,
  size = 'md',
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(quantity));
  const inputRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const holdTimeoutRef = useRef(null);

  const numQty = Number(quantity) || 1;
  const maxStock = max !== undefined && max !== null ? Number(max) : null;
  const isMaxReached = maxStock !== null && numQty >= maxStock;

  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(quantity));
    }
  }, [quantity, isEditing]);

  const isHoldingRef = useRef(false);

  const clearHoldTimers = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const handleStep = (direction) => {
    if (direction === 'inc') {
      if (onIncrease) {
        onIncrease();
      }
    } else if (direction === 'dec') {
      if (onDecrease) {
        onDecrease();
      }
    }
  };

  const startHold = (direction, e) => {
    if (e) e.stopPropagation();
    clearHoldTimers();
    isHoldingRef.current = false;

    holdTimeoutRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      holdIntervalRef.current = setInterval(() => {
        handleStep(direction);
      }, 150);
    }, 400);
  };

  const stopHold = (e) => {
    if (e) e.stopPropagation();
    clearHoldTimers();
  };

  const handleClick = (direction, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      return;
    }
    handleStep(direction);
  };

  const commitInput = () => {
    setIsEditing(false);
    let val = parseInt(inputValue, 10);
    if (isNaN(val) || val < min) {
      val = min;
    }

    if (onChange) {
      onChange(val);
    } else if (val !== numQty) {
      if (val > numQty) {
        for (let i = 0; i < val - numQty; i++) {
          if (onIncrease) onIncrease();
        }
      } else {
        for (let i = 0; i < numQty - val; i++) {
          if (onDecrease) onDecrease();
        }
      }
    }
    const finalDisplayVal = maxStock !== null ? Math.min(val, maxStock) : val;
    setInputValue(String(finalDisplayVal));
  };

  return (
    <div
      role="group"
      aria-label="Quantity selector"
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      className={`d-inline-flex align-items-center bg-light border rounded-pill px-1.5 py-0.5 user-select-none ${className}`}
      style={{
        height: '32px',
        touchAction: 'manipulation',
        outline: 'none'
      }}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        tabIndex={0}
        onClick={(e) => handleClick('dec', e)}
        onMouseDown={(e) => startHold('dec', e)}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={(e) => startHold('dec', e)}
        onTouchEnd={stopHold}
        onTouchCancel={stopHold}
        className="btn btn-link text-dark p-0 border-0 d-flex align-items-center justify-content-center rounded-circle"
        style={{ width: '28px', height: '28px', textDecoration: 'none', touchAction: 'manipulation' }}
      >
        <i className="bi bi-dash" style={{ fontSize: '18px' }}></i>
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commitInput}
          autoFocus
          className="border-0 text-center fw-bold text-dark p-0 m-0 bg-white rounded"
          style={{ width: '32px', fontSize: '13px', outline: 'none', height: '22px' }}
        />
      ) : (
        <span
          role="spinbutton"
          aria-valuenow={numQty}
          aria-valuemin={min}
          aria-valuemax={maxStock || 99}
          title="Click to edit quantity with keyboard"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="fw-bold px-2 text-dark d-flex align-items-center justify-content-center cursor-pointer"
          style={{ minWidth: '28px', textAlign: 'center', fontSize: '13px' }}
        >
          {numQty}
        </span>
      )}

      <button
        type="button"
        disabled={isMaxReached}
        aria-label="Increase quantity"
        tabIndex={0}
        onClick={(e) => handleClick('inc', e)}
        onMouseDown={(e) => startHold('inc', e)}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={(e) => startHold('inc', e)}
        onTouchEnd={stopHold}
        onTouchCancel={stopHold}
        title={isMaxReached ? `Maximum available stock (${maxStock}) reached` : 'Increase quantity'}
        className={`btn btn-link text-dark p-0 border-0 d-flex align-items-center justify-content-center rounded-circle ${
          isMaxReached ? 'opacity-50' : ''
        }`}
        style={{ width: '28px', height: '28px', textDecoration: 'none', touchAction: 'manipulation' }}
      >
        <i className="bi bi-plus" style={{ fontSize: '18px' }}></i>
      </button>
    </div>
  );
};

export default QuantityControl;

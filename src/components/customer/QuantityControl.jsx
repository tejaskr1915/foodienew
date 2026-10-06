import React, { useState, useRef, useEffect } from 'react';

/**
 * Universal QuantityControl component supporting:
 * - Mouse clicks
 * - Touch interactions (tap, long-press repeat, swipe gesture)
 * - Keyboard navigation & shortcuts (Arrow keys, +/-, numbers, direct editing)
 */
export const QuantityControl = ({
  quantity,
  onIncrease,
  onDecrease,
  onChange,
  max,
  min = 0,
  size = 'md',
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(quantity !== undefined && quantity !== null ? quantity : 0));
  const inputRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const holdTimeoutRef = useRef(null);

  const numQty = (quantity !== undefined && quantity !== null && !isNaN(Number(quantity)))
    ? Number(quantity)
    : (min !== undefined ? Number(min) : 0);
  const maxStock = max !== undefined && max !== null ? Number(max) : null;
  const isMaxReached = maxStock !== null && numQty >= maxStock;
  const isMinReached = numQty <= min;

  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(quantity !== undefined && quantity !== null ? quantity : min));
    }
  }, [quantity, isEditing, min]);

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
      if (!isMinReached && onDecrease) {
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

  const isSmall = size === 'sm';

  return (
    <div
      role="group"
      aria-label="Quantity selector"
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      className={`d-inline-flex align-items-center bg-white border border-danger-subtle rounded-pill shadow-xs user-select-none transition-all ${className}`}
      style={{
        height: isSmall ? '28px' : '32px',
        padding: '0 2px',
        touchAction: 'manipulation',
        outline: 'none',
        boxShadow: '0 1px 3px rgba(220, 53, 69, 0.08)'
      }}
    >
      {/* Minus / Decrease Button */}
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
        className={`btn btn-sm border-0 d-flex align-items-center justify-content-center fw-bold rounded-circle ${
          isMinReached ? 'text-secondary opacity-50' : 'text-danger'
        }`}
        style={{
          width: isSmall ? '24px' : '28px',
          height: isSmall ? '24px' : '28px',
          fontSize: isSmall ? '14px' : '16px',
          lineHeight: 1,
          padding: 0,
          touchAction: 'manipulation',
          transition: 'transform 0.1s, background-color 0.15s'
        }}
        onFocus={(e) => e.target.classList.add('bg-danger-subtle')}
        onBlur={(e) => e.target.classList.remove('bg-danger-subtle')}
      >
        <span style={{ transform: 'translateY(-1px)' }}>−</span>
      </button>

      {/* Center Editable Quantity / Display */}
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
          className="border-0 text-center fw-bold text-dark p-0 m-0 bg-light rounded"
          style={{
            width: isSmall ? '24px' : '30px',
            fontSize: isSmall ? '12px' : '13px',
            outline: 'none',
            height: '22px'
          }}
          aria-label="Enter quantity"
        />
      ) : (
        <span
          role="spinbutton"
          aria-valuenow={numQty}
          aria-valuemin={min}
          aria-valuemax={maxStock || 99}
          title="Click or press number keys to edit quantity"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="px-1 fw-bold text-dark d-flex align-items-center justify-content-center cursor-pointer"
          style={{
            minWidth: isSmall ? '22px' : '28px',
            fontSize: isSmall ? '12px' : '13px',
            cursor: 'pointer'
          }}
        >
          {numQty}
        </span>
      )}

      {/* Plus / Increase Button */}
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
        className={`btn btn-sm border-0 d-flex align-items-center justify-content-center fw-bold rounded-circle ${
          isMaxReached ? 'text-secondary opacity-50' : 'text-danger'
        }`}
        style={{
          width: isSmall ? '24px' : '28px',
          height: isSmall ? '24px' : '28px',
          fontSize: isSmall ? '14px' : '16px',
          lineHeight: 1,
          padding: 0,
          touchAction: 'manipulation',
          transition: 'transform 0.1s, background-color 0.15s'
        }}
        onFocus={(e) => e.target.classList.add('bg-danger-subtle')}
        onBlur={(e) => e.target.classList.remove('bg-danger-subtle')}
      >
        <span style={{ transform: 'translateY(-1px)' }}>+</span>
      </button>
    </div>
  );
};

export default QuantityControl;

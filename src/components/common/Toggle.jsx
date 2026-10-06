import React from 'react';

export const Toggle = ({
  label,
  checked,
  onChange,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-check form-switch mb-3 d-flex align-items-center ${className}`}>
      <input
        className="form-check-input cursor-pointer accent-red"
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={onChange}
        style={{ width: '2.5em', height: '1.25em', cursor: 'pointer' }}
        {...props}
      />
      {label && (
        <label className="form-check-label ms-2 small fw-semibold text-secondary cursor-pointer" style={{ cursor: 'pointer' }}>
          {label}
        </label>
      )}
    </div>
  );
};
export default Toggle;

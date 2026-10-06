import React from 'react';

export const Select = ({
  label,
  options = [],
  value,
  onChange,
  error,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label className="form-label small fw-semibold text-secondary">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        className={`form-select rounded-3 py-2 ${error ? 'is-invalid' : ''}`}
        value={value}
        onChange={onChange}
        required={required}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <div className="invalid-feedback d-block mt-1 small">{error}</div>}
    </div>
  );
};
export default Select;

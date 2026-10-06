import React from 'react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary', // primary, secondary, outline, danger, light
  size = 'md', // sm, md, lg
  loading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary-custom';
      case 'secondary':
        return 'btn-secondary-custom';
      case 'outline':
        return 'btn btn-outline-danger rounded-pill';
      case 'danger':
        return 'btn btn-danger rounded-pill';
      case 'light':
        return 'btn btn-light rounded-pill border';
      default:
        return 'btn-primary-custom';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'btn-sm py-1.5 px-3';
      case 'lg':
        return 'btn-lg py-3 px-5';
      default:
        return '';
    }
  };

  return (
    <button
      type={type}
      className={`${getVariantClass()} ${getSizeClass()} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Please wait...
        </>
      ) : (
        children
      )}
    </button>
  );
};
export default Button;

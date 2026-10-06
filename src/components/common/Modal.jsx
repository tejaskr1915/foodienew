import React from 'react';

export const Modal = ({
  isOpen,
  title,
  onClose,
  children,
  size = 'md', // sm, md, lg
  footerActions
}) => {
  if (!isOpen) return null;

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'modal-sm';
      case 'lg': return 'modal-lg';
      default: return '';
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex="-1">
      <div className={`modal-dialog modal-dialog-centered ${getSizeClass()}`}>
        <div className="modal-content rounded-4 border-0 shadow-lg p-3">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold text-dark">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          
          <div className="modal-body py-3">
            {children}
          </div>

          {footerActions && (
            <div className="modal-footer border-top-0 pt-0 gap-2">
              {footerActions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Modal;

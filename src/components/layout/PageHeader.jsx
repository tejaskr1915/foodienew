import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft } from 'react-icons/fi';

export const PageHeader = ({
  title,
  showBackButton = false,
  backUrl,
  onBack,
  actions,
  className = ""
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-3 border-bottom gap-3 ${className}`}>
      <div className="d-flex align-items-center gap-2">
        {showBackButton && (
          <button 
            type="button"
            onClick={handleBack} 
            className="btn btn-light rounded-circle p-2 border d-flex align-items-center justify-content-center"
            style={{ width: '36px', height: '36px' }}
            title="Back to Manage Menus"
          >
            <FiChevronLeft size={20} />
          </button>
        )}
        <h3 className="fw-bold text-dark mb-0">{title}</h3>
      </div>
      {actions && <div className="d-flex align-items-center gap-2">{actions}</div>}
    </div>
  );
};
export default PageHeader;

import React from 'react';

export const Badge = ({
  status,
  className = '',
  ...props
}) => {
  const getBadgeClass = () => {
    switch (status) {
      // Order Statuses
      case 'Pending':
        return 'bg-secondary-subtle text-secondary border';
      case 'Preparing':
        return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      case 'Ready':
        return 'bg-info-subtle text-info-emphasis border border-info-subtle';
      case 'Serving':
      case 'Served':
        return 'bg-primary-light text-danger border border-danger-subtle';
      case 'Completed':
        return 'bg-success-subtle text-success border border-success-subtle';
      case 'Cancelled':
        return 'bg-danger-subtle text-danger border border-danger-subtle';

      // Table Statuses
      case 'Available':
        return 'bg-success-subtle text-success border border-success-subtle';
      case 'Occupied':
        return 'bg-danger-subtle text-danger border border-danger-subtle';
      case 'Reserved':
        return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';

      // General Statuses
      case 'Active':
      case 'In Stock':
        return 'bg-success-subtle text-success border border-success-subtle';
      case 'Inactive':
      case 'Out of Stock':
        return 'bg-danger-subtle text-danger border border-danger-subtle';
      case 'Low Stock':
        return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';

      default:
        return 'bg-light text-dark border';
    }
  };

  return (
    <span className={`badge rounded-pill px-3 py-1.5 fw-bold ${getBadgeClass()} ${className}`} {...props}>
      {status}
    </span>
  );
};
export default Badge;

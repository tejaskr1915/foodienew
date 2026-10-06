import React from 'react';
import { useNavigate } from 'react-router-dom';
import formatCurrency from '../../utils/formatCurrency';
import { FiUsers, FiTrendingUp, FiShoppingBag } from 'react-icons/fi';

export const BusinessData = ({ data }) => {
  const navigate = useNavigate();
  const stats = data || {
    customersCount: 0,
    ordersCount: 0,
    avgOrderValue: 0
  };

  return (
    <div className="card rounded-3 border-0 shadow-sm p-4 bg-white h-100">
      <h5 className="fw-bold text-dark mb-4">Business Performance</h5>
      
      <div className="d-flex flex-column gap-3">
        <div 
          className="d-flex align-items-center justify-content-between p-3 border rounded-3 bg-light-subtle"
        >
          <div className="d-flex align-items-center gap-3">
            <div className="bg-danger-subtle text-danger rounded p-2">
              <FiUsers size={20} />
            </div>
            <div>
              <div className="small text-secondary fw-semibold">Customers Today</div>
              <h5 className="fw-bold text-dark mb-0">{stats.customersCount}</h5>
            </div>
          </div>
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Today</span>
        </div>

        <div 
          className="d-flex align-items-center justify-content-between p-3 border rounded-3 bg-light-subtle"
        >
          <div className="d-flex align-items-center gap-3">
            <div className="bg-success-subtle text-success rounded p-2">
              <FiShoppingBag size={20} />
            </div>
            <div>
              <div className="small text-secondary fw-semibold">Total Orders Today</div>
              <h5 className="fw-bold text-dark mb-0">{stats.ordersCount}</h5>
            </div>
          </div>
          <span className="badge bg-success-subtle text-success border border-success-subtle">Today</span>
        </div>

        <div 
          className="d-flex align-items-center justify-content-between p-3 border rounded-3 bg-light-subtle"
        >
          <div className="d-flex align-items-center gap-3">
            <div className="bg-info-subtle text-info-emphasis rounded p-2">
              <FiTrendingUp size={20} />
            </div>
            <div>
              <div className="small text-secondary fw-semibold">Average Order Value</div>
              <h5 className="fw-bold text-dark mb-0">{formatCurrency(stats.avgOrderValue)}</h5>
            </div>
          </div>
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">Live</span>
        </div>
      </div>
    </div>
  );
};
export default BusinessData;

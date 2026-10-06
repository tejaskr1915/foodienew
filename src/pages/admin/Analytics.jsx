import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import { FiTrendingUp, FiShoppingBag, FiActivity } from 'react-icons/fi';

export const Analytics = () => {
  return (
    <AdminLayout>
      <PageHeader title="Store Analytics" showBackButton />

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div className="card rounded-3 border-0 shadow-sm p-4 bg-white text-center">
            <FiActivity size={36} className="text-danger mb-3 mx-auto" />
            <h5 className="fw-bold text-dark">System Health</h5>
            <p className="text-secondary small mb-0">API Connection: <strong className="text-success">Online</strong></p>
            <p className="text-secondary small">Database Latency: <strong className="text-success">14ms</strong></p>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card rounded-3 border-0 shadow-sm p-4 bg-white text-center">
            <FiShoppingBag size={36} className="text-danger mb-3 mx-auto" />
            <h5 className="fw-bold text-dark">Order Stats</h5>
            <p className="text-secondary small mb-0">Conversion Rate: <strong className="text-dark">88.4%</strong></p>
            <p className="text-secondary small">Cancel Rate: <strong className="text-danger">1.2%</strong></p>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card rounded-3 border-0 shadow-sm p-4 bg-white text-center">
            <FiTrendingUp size={36} className="text-danger mb-3 mx-auto" />
            <h5 className="fw-bold text-dark">Growth Metrics</h5>
            <p className="text-secondary small mb-0">New Diners: <strong className="text-success">+24%</strong></p>
            <p className="text-secondary small">Month-over-Month: <strong className="text-success">+15.8%</strong></p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
export default Analytics;

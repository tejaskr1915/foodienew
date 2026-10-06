import React, { useState } from 'react';
import Badge from '../common/Badge';
import formatCurrency from '../../utils/formatCurrency';
import { FiClock, FiLayers, FiDownload } from 'react-icons/fi';
import { generateEBillPDF } from '../../utils/generateEBillPDF';

export const OrderCard = ({
  order,
  onViewDetails,
  onViewEBill
}) => {
  const itemsSummary = order.items.map((i) => `${i.name} x${i.quantity}`).join(', ');

  return (
    <div className="card rounded-3 border-0 shadow-sm p-4 bg-white foodie-card mb-3">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center border-bottom pb-3 mb-3 gap-2">
        <div>
          <span className="fw-bold text-dark fs-5">Order #{order.id}</span>
          <div className="text-muted small mt-1 d-flex align-items-center gap-1">
            <FiClock /> {order.date} at {order.time}
          </div>
        </div>
        <Badge status={order.status} />
      </div>

      <div className="row align-items-center">
        <div className="col-12 col-md-8 mb-3 mb-md-0">
          <div className="text-secondary small fw-semibold d-flex align-items-center gap-1">
            <FiLayers /> TABLE: <strong>{order.table}</strong> ({order.diners} Diners)
          </div>
          <div className="fw-bold text-dark text-truncate mt-2" style={{ maxWidth: '400px' }}>
            {itemsSummary}
          </div>
          <div className="text-muted small mt-1">
            Source: <strong>{order.source}</strong> | Payment: <strong>{order.paymentMethod}</strong>
          </div>
        </div>

        <div className="col-12 col-md-4 text-start text-md-end">
          <div className="text-secondary small">Total Amount</div>
          <h4 className="fw-bold text-danger mt-1 mb-3">{formatCurrency(order.total)}</h4>
          <div className="d-flex align-items-center justify-content-start justify-content-md-end gap-2 flex-wrap">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); if(onViewEBill) onViewEBill(order); }}
              className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
              title="View E-Bill"
            >
              <FiDownload size={13} />
              <span>Show Bill</span>
            </button>
            <button 
              onClick={() => onViewDetails(order)} 
              className="btn btn-danger btn-sm rounded-pill px-3.5 fw-bold text-white shadow-xs"
              style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderCard;

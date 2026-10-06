import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import formatCurrency from '../../utils/formatCurrency';
import { useAuth } from '../../hooks/useAuth';
import { FiDownload } from 'react-icons/fi';
import { generateEBillPDF } from '../../utils/generateEBillPDF';

export const OrderDetailsModal = ({
  isOpen,
  order,
  onClose,
  onStatusChange,
  onViewEBill
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'employee';
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const handleStatusUpdate = async (nextStatus) => {
    setLoading(true);
    try {
      await onStatusChange(order.id, nextStatus);
    } catch (e) {}
    setLoading(false);
    onClose();
  };

  const getActionButtons = () => {
    return (
      <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { if(onViewEBill) onViewEBill(); }}
          className="btn btn-outline-danger fw-bold d-flex align-items-center gap-1.5 rounded-pill px-3 py-2"
          style={{ fontSize: '13px' }}
        >
          <FiDownload size={15} />
          <span>View E-Bill</span>
        </button>

        {isAdmin && (
          <div className="d-flex align-items-center gap-2">
            {order.status === 'Pending' && (
              <>
                <Button variant="danger" onClick={() => handleStatusUpdate('Cancelled')} disabled={loading}>
                  Reject
                </Button>
                <Button variant="primary" onClick={() => handleStatusUpdate('Preparing')} loading={loading}>
                  Accept Order
                </Button>
              </>
            )}
            {order.status === 'Preparing' && (
              <Button variant="primary" onClick={() => handleStatusUpdate('Ready')} loading={loading}>
                Mark Ready (Sent to Counter)
              </Button>
            )}
            {order.status === 'Ready' && (
              <Button variant="primary" onClick={() => handleStatusUpdate('Serving')} loading={loading}>
                Serve to Table
              </Button>
            )}
            {(order.status === 'Serving' || order.status === 'Served') && (
              <Button variant="primary" onClick={() => handleStatusUpdate('Completed')} loading={loading}>
                Complete Session (Settle Bill)
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} title={`Order details #${order.id}`} onClose={onClose} footerActions={getActionButtons()} size="lg">
      <div className="row g-4">
        {/* Left Column: Items and summary */}
        <div className="col-12 col-md-7">
          <h6 className="fw-bold text-dark mb-3">Items Ordered</h6>
          <div className="bg-light p-3 rounded-3 mb-4">
            {order.items && order.items.length > 0 ? order.items.map((item, idx) => (
              <div key={idx} className="d-flex align-items-start justify-content-between mb-2 small border-bottom border-light pb-2 last-border-0">
                <div className="text-dark fw-semibold text-break me-2">
                  {item.name || 'Dish Item'} <strong className="text-danger ms-1">x{item.quantity || 1}</strong>
                  {item.instructions && <div className="text-muted fw-normal mt-1" style={{ fontSize: '11px' }}>Note: {item.instructions}</div>}
                  {item.extraIngredients && item.extraIngredients.length > 0 && (
                    <div className="text-muted fw-normal mt-1" style={{ fontSize: '11px' }}>
                      Extras: {item.extraIngredients.join(', ')}
                    </div>
                  )}
                </div>
                <span className="fw-bold text-dark text-nowrap">{formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
              </div>
            )) : (
              <div className="text-muted small">No items recorded for this order.</div>
            )}
          </div>

          <h6 className="fw-bold text-dark mb-3">Invoice calculations</h6>
          <div className="small p-2 border rounded-3">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-secondary">Subtotal</span>
              <span className="text-dark fw-bold">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="d-flex align-items-center justify-content-between mb-1 text-success">
                <span>Voucher Discount</span>
                <span className="fw-bold">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {(order.voucher || order.voucherCode || order.coupon) && (
              <div className="d-flex align-items-center justify-content-between mb-1 text-success">
                <span>Voucher Applied</span>
                <span className="fw-bold font-monospace">{order.voucher || order.voucherCode || order.coupon}</span>
              </div>
            )}
            {(order.packingCharge > 0 || order.packing_charge > 0 || order.orderType === 'Takeaway' || order.table === 'Takeaway') && (
              <div className="d-flex align-items-center justify-content-between mb-1 text-dark">
                <span className="text-secondary">Packing Charges (Takeaway)</span>
                <span className="text-dark fw-bold">+{formatCurrency(order.packingCharge || order.packing_charge || (((order.items || []).reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || 1) * 15))}</span>
              </div>
            )}
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-secondary">Taxes / GST (5%)</span>
              <span className="text-dark fw-bold">{formatCurrency(order.tax)}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between border-top pt-2 mt-2 fw-bold text-danger fs-5">
              <span>Grand Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Order Context Info and history logs */}
        <div className="col-12 col-md-5 border-start border-light-subtle">
          <h6 className="fw-bold text-dark mb-3">Order Details</h6>
          <div className="p-3 border rounded-3 bg-light mb-4 small">
            <div className="mb-2">Order Type: <strong className="text-danger">{order.orderType || (order.table === 'Takeaway' ? 'Takeaway' : 'Dining')}</strong></div>
            {order.table !== 'Takeaway' && (
              <div className="mb-2">Table No: <strong>{order.table}</strong></div>
            )}
            <div className="mb-2">Diners: <strong>{order.diners}</strong></div>
            <div className="mb-2">Source: <strong>{order.source}</strong></div>
            <div className="mb-2">Payment Method: <strong>{order.paymentMethod}</strong></div>
            <div>Date/Time: <strong>{order.date} at {order.time}</strong></div>
          </div>

          <h6 className="fw-bold text-dark mb-3">Operation History</h6>
          <div className="d-flex flex-column gap-3 small border-start ps-3" style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {order.history?.map((h, idx) => (
              <div key={idx} className="position-relative mb-2">
                <span className="position-absolute bg-danger rounded-circle" style={{ width: '8px', height: '8px', left: '-21px', top: '5px' }}></span>
                <div className="fw-bold text-dark">{h.action}</div>
                <div className="text-secondary" style={{ fontSize: '11px' }}>{h.operator} | {h.time}</div>
                <p className="text-muted mb-0 mt-0.5" style={{ fontSize: '11px' }}>{h.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
export default OrderDetailsModal;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import Loader from '../../components/common/Loader';
import BackButton from '../../components/common/BackButton';
import formatCurrency from '../../utils/formatCurrency';
import { FiClock, FiCheck, FiXCircle, FiDownload } from 'react-icons/fi';
import { generateEBillPDF } from '../../utils/generateEBillPDF';
import { normalizeFoodType } from '../../utils/filters';
import EBillModal from '../../components/orders/EBillModal';

export const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { loadOrderIntoCart } = useCart();

  const initialOrder = location.state?.order || null;
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleDownloadEBill = async () => {
    setDownloadingPdf(true);
    try {
      const target = order || { id: orderId };
      await generateEBillPDF(target);
    } catch (e) {
      console.error("[E-BILL DOWNLOAD ERROR]", e);
    }
    setDownloadingPdf(false);
  };

  // Employee track order redirect to Tables
  useEffect(() => {
    if (user && (user.role === 'employee' || user.role === 'admin')) {
      navigate('/admin/tables', { replace: true });
    }
  }, [user, navigate]);

  const normalizeStatus = (status) => {
    if (!status) return 'Pending';
    const s = String(status).toLowerCase().trim();
    if (s === 'placed' || s === 'pending' || s === 'confirmed' || s === 'new' || s === 'ordered' || s === 'created' || s === 'processing') return 'Pending';
    if (s === 'preparing' || s === 'cooking' || s === 'accepted' || s === 'in_kitchen') return 'Preparing';
    if (s === 'ready' || s === 'out_for_delivery' || s === 'prepared' || s === 'ready_for_pickup') return 'Ready';
    if (s === 'served' || s === 'serving') return 'Serving';
    if (s === 'delivered' || s === 'completed' || s === 'done' || s === 'settled') return 'Completed';
    if (s === 'cancelled' || s === 'canceled' || s === 'rejected' || s === 'void') return 'Cancelled';
    return status;
  };

  const getOrderTotal = (ord) => {
    if (!ord) return 0;
    const direct = parseFloat(ord.total ?? ord.total_amount ?? ord.totalAmount ?? ord.amount ?? 0);
    if (!isNaN(direct) && direct > 0) return direct;

    const isTakeaway = ord.orderType === 'Takeaway' || ord.table === 'Takeaway' || String(ord.table).toLowerCase() === 'takeaway' || ord.packingCharge > 0 || ord.packing_charge > 0;
    const totalQty = (ord.items || []).reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || 1;
    const packingCharge = parseFloat(ord.packingCharge || ord.packing_charge || (isTakeaway ? totalQty * 15 : 0));

    if (Array.isArray(ord.items) && ord.items.length > 0) {
      const itemsSum = ord.items.reduce((s, i) => s + (parseFloat(i.price || 0) * (parseInt(i.quantity) || 1)), 0);
      if (itemsSum > 0) {
        const discount = parseFloat(ord.discount || 0);
        const taxableAmount = Math.max(0, itemsSum - discount) + (isTakeaway ? packingCharge : 0);
        const tax = parseFloat(ord.tax || 0) || Math.round(taxableAmount * 0.05);
        const deliveryFee = parseFloat(ord.deliveryFee || ord.delivery_fee || 0);
        return Math.max(0, taxableAmount + tax + deliveryFee);
      }
    }

    try {
      const saved = JSON.parse(localStorage.getItem(`foodie_saved_order_${ord.id}`) || 'null');
      if (saved && parseFloat(saved.total) > 0) return parseFloat(saved.total);
    } catch (e) {}

    try {
      const last = JSON.parse(localStorage.getItem('foodie_last_placed_order') || 'null');
      if (last && String(last.id) === String(ord.id) && parseFloat(last.total) > 0) return parseFloat(last.total);
    } catch (e) {}

    return 0;
  };

  const statusRef = React.useRef(order?.status);

  useEffect(() => {
    statusRef.current = order?.status;
  }, [order?.status]);

  // Real-time polling and current order retrieval
  useEffect(() => {
    let intervalId;
    const fetchTrackingData = async (isInitial = false) => {
      if (isInitial && !order) setLoading(true);
      setError(null);

      try {
        const currentData = await orderService.getOrderById(orderId, true, true);
        if (currentData) {
          const effectiveStatus = currentData.status;
          statusRef.current = effectiveStatus;
          const effectiveTotal = (currentData.total && Number(currentData.total) > 0)
            ? currentData.total
            : ((order && order.total && Number(order.total) > 0) ? order.total : getOrderTotal(currentData));
          const effectiveItems = (currentData.items && currentData.items.length > 0)
            ? currentData.items
            : (order?.items || []);

          setOrder(prev => ({
            ...(prev || {}),
            ...currentData,
            status: effectiveStatus,
            total: effectiveTotal,
            items: effectiveItems
          }));
        }
      } catch (err) {
        if (!order) {
          setError(err.message || 'Unable to load order tracking. Please try again.');
        }
      }
      if (isInitial) setLoading(false);
    };

    if (orderId && orderId !== 'undefined' && orderId !== 'null') {
      fetchTrackingData(!order);

      const handleSync = () => {
        fetchTrackingData(false);
      };

      window.addEventListener('foodie_orders_updated', handleSync);
      window.addEventListener('storage', handleSync);

      return () => {
        window.removeEventListener('foodie_orders_updated', handleSync);
        window.removeEventListener('storage', handleSync);
      };
    }
  }, [orderId]);

  if (loading && !order) {
    return (
      <CustomerLayout>
        <div className="min-vh-100 d-flex align-items-center justify-content-center">
          <Loader />
        </div>
      </CustomerLayout>
    );
  }

  if (error && !order) {
    return (
      <CustomerLayout>
        <main className="pt-4 text-center mx-auto" style={{ maxWidth: '600px' }}>
          <div className="text-start mb-3">
            <BackButton to="/customer/home" />
          </div>
          <div className="alert alert-danger p-4 rounded-3 text-center shadow-sm">
            <h5 className="fw-bold mb-2">Error Loading Tracking</h5>
            <p className="small mb-0">{error}</p>
          </div>
        </main>
      </CustomerLayout>
    );
  }

  if (!order) {
    return (
      <CustomerLayout>
        <main className="pt-4 text-center mx-auto" style={{ maxWidth: '600px' }}>
          <div className="text-start mb-3">
            <BackButton to="/customer/home" />
          </div>
          <div className="alert alert-warning p-4 rounded-3 text-center shadow-sm">
            <h5 className="fw-bold mb-2">Order Not Found</h5>
            <p className="small mb-0">Order not found.</p>
          </div>
        </main>
      </CustomerLayout>
    );
  }

  // Pipeline order stages mapping
  const stages = [
    { key: 'Pending', label: 'Order Confirmed', sub: 'We received your food ticket' },
    { key: 'Preparing', label: 'Preparing', sub: 'Our Chef is preparing your dish' },
    { key: 'Ready', label: 'Ready', sub: 'Food packaged at counter' },
    { key: 'Serving', label: 'Serving', sub: `Delivered to Table ${order.table || 'Takeaway'}` },
    { key: 'Completed', label: 'Completed', sub: 'Bill settled successfully' }
  ];

  const resolveCurrentStatus = () => {
    return normalizeStatus(order?.status);
  };

  const currentStatus = resolveCurrentStatus();
  const getStatusIndex = (status) => {
    const keys = stages.map(s => s.key);
    const idx = keys.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  const currentIndex = getStatusIndex(currentStatus);

  return (
    <CustomerLayout>
      <main className="pt-2 text-start mx-auto animate-fade-in" style={{ maxWidth: '600px' }}>
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/customer/home" />
            <h4 className="fw-bold text-dark mb-0">Track Order</h4>
          </div>
          {String(currentStatus || order?.status || '').toLowerCase() === 'completed' && (
            <button
              type="button"
              onClick={handleDownloadEBill}
              disabled={downloadingPdf}
              className="btn btn-sm btn-danger text-white fw-bold rounded-pill px-3 py-1.5 shadow-sm d-flex align-items-center gap-1.5"
              style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)', fontSize: '12px' }}
            >
              <FiDownload size={14} />
              <span>{downloadingPdf ? 'Generating...' : 'Download E-Bill'}</span>
            </button>
          )}
        </div>

        {/* Info Header Card for Tracked Order */}
        <div className="card rounded-4 border-0 shadow-sm p-4 bg-white mb-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <span className="small text-secondary fw-semibold">ORDER ID</span>
              <h4 className="fw-extrabold text-dark mb-0 font-monospace">
                #{order?.id || orderId}
              </h4>
            </div>
            <div className="text-end">
              <span className="small text-secondary fw-semibold">TOTAL AMOUNT</span>
              <h4 className="fw-bold text-danger mb-0">{formatCurrency(getOrderTotal(order))}</h4>
            </div>
          </div>

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-3 border-top border-light-subtle small text-secondary">
            <div className="d-flex align-items-center gap-1.5">
              <FiClock className="text-muted" />
              <span>Placed at: <strong>{order.time}</strong></span>
            </div>
            {(order.voucher || order.voucherCode || order.coupon) && (
              <div className="d-flex align-items-center gap-1.5 text-success">
                <span>Voucher Applied: <strong className="font-monospace">{order.voucher || order.voucherCode || order.coupon}</strong></span>
              </div>
            )}
            <div>
              <span>Table Context: <strong>{order.table || 'Takeaway'}</strong></span>
            </div>
          </div>

          <div className="pt-3 mt-3 border-top border-light d-flex gap-2">
            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="btn btn-outline-danger w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-xs"
            >
              <i className="bi bi-receipt"></i>
              <span>View E-Bill / Receipt</span>
            </button>
          </div>
        </div>

        {/* Tracking Stages Flow */}
        <div className="card rounded-4 border-0 shadow-sm p-4 bg-white mb-4">
          <h5 className="fw-bold text-dark mb-4">Order Status Pipeline</h5>
          
          <div className="d-flex flex-column gap-4 border-start ps-4 position-relative ms-2">
            {stages.map((stage, idx) => {
              const isPast = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              const isServing = currentStatus === 'Serving' || currentStatus === 'Served' || currentIndex === 3;
              const isStageCompletedWhenServing = isServing && stage.key === 'Completed';

              let textClass = 'text-muted';
              let icon = null;
              
              if (isPast || isStageCompletedWhenServing) {
                textClass = 'text-dark';
                icon = <FiCheck size={10} />;
              } else if (isCurrent) {
                textClass = 'text-danger fw-bold';
                icon = <span className="bg-white rounded-circle" style={{ width: '6px', height: '6px' }}></span>;
              }

              const isColoured = isPast || isCurrent || isStageCompletedWhenServing;

              return (
                <div key={stage.key} className={`position-relative ${textClass}`}>
                  {/* Left Circle Indicator */}
                  <span 
                    className="position-absolute rounded-circle d-flex align-items-center justify-content-center" 
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      left: '-33px', 
                      top: '3px',
                      backgroundColor: isColoured ? 'var(--primary-color)' : '#e2e8f0',
                      color: '#ffffff',
                      fontSize: '10px'
                    }}
                  >
                    {icon}
                  </span>
                  
                  {/* Label & Details */}
                  <div className="small">
                    <span className="d-block text-dark fw-bold fs-6">
                      {stage.key === 'Pending' ? 'Order Confirmed' : stage.label}
                    </span>
                    <span className="text-secondary small d-block mt-0.5">{stage.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {order.status === 'Cancelled' && (
          <div className="alert alert-danger rounded-4 p-3 fw-bold small text-center mb-4 shadow-sm">
            This order has been cancelled.
          </div>
        )}

        {/* Items Summary Card for Current Order */}
        <div className="card rounded-4 border-0 shadow-sm p-4 bg-white mb-4">
          <h5 className="fw-bold text-dark mb-3">Items in Order #{order.id}</h5>
          <div className="d-flex flex-column gap-2">
            {Array.isArray(order.items) && order.items.length > 0 ? (
              order.items.map((i, idx) => (
                <div key={idx} className="d-flex align-items-center justify-content-between py-2 border-bottom border-light last-border-none">
                  <div className="d-flex align-items-start gap-2">
                    <span className={`mt-1 ${normalizeFoodType(i.foodType || i.type || (i.is_veg === false || i.is_veg === 'false' ? 'non-veg' : 'veg')) === 'veg' ? 'veg-badge' : normalizeFoodType(i.foodType || i.type || (i.is_veg === false || i.is_veg === 'false' ? 'non-veg' : 'veg')) === 'vegan' ? 'vegan-badge' : 'non-veg-badge'}`}></span>
                    <div>
                      <span className="fw-bold text-dark">{i.name || 'Dish Item'}</span>
                      <span className="text-secondary small ms-2">x{i.quantity || 1}</span>
                      {i.instructions && (
                        <span className="d-block text-danger small mt-0.5 font-italic">
                          Note: "{i.instructions}"
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="fw-semibold text-dark">{formatCurrency((i.price || 0) * (i.quantity || 1))}</span>
                </div>
              ))
            ) : (
              <p className="text-muted small mb-0">Order received and confirmed.</p>
            )}
          </div>
        </div>
      </main>

      <EBillModal
        isOpen={showReceiptModal}
        order={order}
        onClose={() => setShowReceiptModal(false)}
      />
    </CustomerLayout>
  );
};

export default OrderTracking;

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import Button from '../../components/common/Button';
import formatCurrency from '../../utils/formatCurrency';
import BackButton from '../../components/common/BackButton';
import { FiCheckCircle, FiEdit3, FiXCircle, FiDownload } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { orderService } from '../../services/orderService';
import { mockOrders } from '../../data/mockData/orders';
import { generateEBillPDF } from '../../utils/generateEBillPDF';
import EBillModal from '../../components/orders/EBillModal';

export const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { loadOrderIntoCart } = useCart();
  const isEmployee = user?.role === 'employee' || user?.role === 'admin';

  const getInitialOrder = () => {
    if (location.state?.order) return location.state.order;
    if (location.state?.orderId || location.state?.id) return location.state;
    try {
      const saved = sessionStorage.getItem('foodie_last_placed_order') || localStorage.getItem('foodie_last_placed_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
    } catch (e) { }
    try {
      const currentUserId = user?.id ? String(user.id) : null;
      const currentPhone = user?.phone ? String(user.phone).replace(/\D/g, '').slice(-10) : null;
      const userKey = currentUserId ? `foodie_customer_order_ids_${currentUserId}` : (currentPhone ? `foodie_customer_order_ids_${currentPhone}` : 'foodie_guest_order_ids');
      const savedIds = JSON.parse(localStorage.getItem(userKey) || '[]');
      if (savedIds.length > 0) {
        const savedOrder = localStorage.getItem(`foodie_saved_order_${savedIds[0]}`);
        if (savedOrder) return JSON.parse(savedOrder);
      }
    } catch (e) { }
    return null;
  };

  const [order, setOrder] = useState(getInitialOrder);
  const [orderStatus, setOrderStatus] = useState(() => order?.status || 'Pending');
  const [loadingAction, setLoadingAction] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(Boolean(location.state?.autoShowReceipt));

  const handleDownloadEBill = async () => {
    setDownloadingPdf(true);
    try {
      const target = order || { id: orderId, total: totalAmount, table: tableDisplay };
      await generateEBillPDF(target);
    } catch (e) {
      console.error("[E-BILL DOWNLOAD ERROR]", e);
    }
    setDownloadingPdf(false);
  };

  useEffect(() => {
    const resolveOrderDetails = async () => {
      let current = location.state?.order || (location.state?.orderId || location.state?.id ? location.state : null);

      if (!current) {
        try {
          const saved = sessionStorage.getItem('foodie_last_placed_order') || localStorage.getItem('foodie_last_placed_order');
          if (saved) current = JSON.parse(saved);
        } catch (e) { }
      }

      if (!current) {
        try {
          const currentUserId = user?.id ? String(user.id) : null;
          const currentPhone = user?.phone ? String(user.phone).replace(/\D/g, '').slice(-10) : null;
          const userKey = currentUserId ? `foodie_customer_order_ids_${currentUserId}` : (currentPhone ? `foodie_customer_order_ids_${currentPhone}` : 'foodie_guest_order_ids');
          const savedIds = JSON.parse(localStorage.getItem(userKey) || '[]');
          if (savedIds.length > 0) {
            const savedOrder = localStorage.getItem(`foodie_saved_order_${savedIds[0]}`);
            if (savedOrder) current = JSON.parse(savedOrder);
          }
        } catch (e) { }
      }

      const curId = current?.id || current?.order_id || current?.orderId;
      const curTotal = parseFloat(current?.total ?? current?.total_amount ?? current?.totalAmount ?? current?.amount ?? 0);

      // If we don't have order or total is 0 or ID is missing, fetch from API
      if (!current || curTotal === 0 || !curId) {
        try {
          const currentUserId = user?.id ? String(user.id) : null;
          const currentPhone = user?.phone ? String(user.phone).replace(/\D/g, '').slice(-10) : null;
          const userKey = currentUserId ? `foodie_customer_order_ids_${currentUserId}` : (currentPhone ? `foodie_customer_order_ids_${currentPhone}` : 'foodie_guest_order_ids');
          const savedIds = JSON.parse(localStorage.getItem(userKey) || '[]');
          const targetId = curId || (savedIds.length > 0 ? savedIds[0] : null);

          if (targetId) {
            const fresh = await orderService.getOrderById(targetId);
            if (fresh && fresh.id) {
              setOrder(fresh);
              setOrderStatus(fresh.status || 'Pending');
              try {
                sessionStorage.setItem('foodie_last_placed_order', JSON.stringify(fresh));
                localStorage.setItem('foodie_last_placed_order', JSON.stringify(fresh));
              } catch (e) { }
              return;
            }
          }

          // Fallback to latest customer orders from service
          const allCustomerOrders = await orderService.getOrders();
          if (allCustomerOrders && allCustomerOrders.length > 0) {
            const latest = [...allCustomerOrders].sort((a, b) => {
              const timeA = a.placedAt || a.rawCreatedAt || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
              const timeB = b.placedAt || b.rawCreatedAt || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              return timeB - timeA;
            })[0];

            if (latest && latest.id) {
              setOrder(latest);
              setOrderStatus(latest.status || 'Pending');
              try {
                sessionStorage.setItem('foodie_last_placed_order', JSON.stringify(latest));
                localStorage.setItem('foodie_last_placed_order', JSON.stringify(latest));
              } catch (e) { }
              return;
            }
          }
        } catch (e) {
          console.error("Could not fetch latest order:", e);
        }
      }

      if (current) {
        setOrder(current);
        setOrderStatus(current.status || 'Pending');
        try {
          sessionStorage.setItem('foodie_last_placed_order', JSON.stringify(current));
          localStorage.setItem('foodie_last_placed_order', JSON.stringify(current));
        } catch (e) { }
      }
    };

    resolveOrderDetails();
  }, [location.state]);

  const getCalculatedTotal = (ord) => {
    if (!ord) return 0;
    const directTotal = parseFloat(ord.total ?? ord.total_amount ?? ord.totalAmount ?? ord.amount ?? 0);
    if (!isNaN(directTotal) && directTotal > 0) return directTotal;

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

    const subtotal = parseFloat(ord.subtotal || 0);
    if (!isNaN(subtotal) && subtotal > 0) {
      const discount = parseFloat(ord.discount || 0);
      const taxableAmount = Math.max(0, subtotal - discount) + (isTakeaway ? packingCharge : 0);
      const tax = parseFloat(ord.tax || 0) || Math.round(taxableAmount * 0.05);
      return Math.max(0, taxableAmount + tax);
    }

    return 0;
  };

  const backendOrderId = order?.id || order?.order_id || order?.orderId || '';
  const orderId = backendOrderId;
  const totalAmount = getCalculatedTotal(order);
  const tableDisplay = order?.table || order?.tableNumber || order?.table_no || (order?.orderType === 'Takeaway' ? 'Takeaway' : 'T01');
  const voucherCode = order?.voucher || order?.voucherCode || order?.coupon || null;

  useEffect(() => {
    if (orderId) {
      const now = Date.now();
      let currentItems = (order?.items && Array.isArray(order.items) && order.items.length > 0) ? order.items : null;
      if (!currentItems || currentItems.length === 0) {
        try {
          const lastItems = JSON.parse(sessionStorage.getItem('foodie_last_order_items') || localStorage.getItem('foodie_last_order_items') || 'null');
          if (Array.isArray(lastItems) && lastItems.length > 0) {
            currentItems = lastItems;
          }
        } catch (e) { }
      }
      if (!currentItems || currentItems.length === 0) {
        try {
          const savedOrd = JSON.parse(localStorage.getItem(`foodie_saved_order_${orderId}`) || 'null');
          if (savedOrd && Array.isArray(savedOrd.items) && savedOrd.items.length > 0) {
            currentItems = savedOrd.items;
          }
        } catch (e) { }
      }
      if (!currentItems || currentItems.length === 0) {
        const mock = mockOrders.find(m => String(m.id) === String(orderId));
        if (mock && Array.isArray(mock.items) && mock.items.length > 0) {
          currentItems = mock.items;
        }
      }
      if (!currentItems) {
        currentItems = [];
      }

      const existingSaved = localStorage.getItem(`foodie_saved_order_${orderId}`);
      let existingStatus = 'Pending';
      if (existingSaved) {
        try {
          const parsed = JSON.parse(existingSaved);
          if (parsed?.status) existingStatus = parsed.status;
        } catch (e) { }
      }

      const fullConfirmedOrder = {
        id: orderId,
        order_id: orderId,
        table: tableDisplay,
        total: totalAmount > 0 ? totalAmount : 231,
        total_amount: totalAmount > 0 ? totalAmount : 231,
        status: orderStatus || existingStatus || 'Pending',
        items: currentItems,
        date: order?.date || new Date(now).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: order?.time || new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        placedAt: order?.placedAt || now,
        rawCreatedAt: order?.rawCreatedAt || now,
        statusTimes: { Pending: order?.placedAt || now }
      };

      try {
        localStorage.setItem(`foodie_saved_order_${orderId}`, JSON.stringify(fullConfirmedOrder));
        localStorage.setItem('foodie_last_placed_order', JSON.stringify(fullConfirmedOrder));
        sessionStorage.setItem('foodie_last_placed_order', JSON.stringify(fullConfirmedOrder));

        const existingAll = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
        const filteredExisting = existingAll.filter(o => String(o.id || o.order_id) !== String(orderId));
        localStorage.setItem('foodie_all_placed_orders', JSON.stringify([fullConfirmedOrder, ...filteredExisting]));

        const overrides = JSON.parse(localStorage.getItem('foodie_order_status_overrides') || '{}');
        if (!overrides[String(orderId)]) {
          overrides[String(orderId)] = fullConfirmedOrder.status;
          localStorage.setItem('foodie_order_status_overrides', JSON.stringify(overrides));
        }

        const currentUserId = user?.id ? String(user.id) : null;
        const currentPhone = user?.phone ? String(user.phone).replace(/\D/g, '').slice(-10) : null;
        if (currentUserId) {
          const userKey = `foodie_customer_order_ids_${currentUserId}`;
          const saved = JSON.parse(localStorage.getItem(userKey) || '[]');
          if (!saved.includes(String(orderId))) {
            localStorage.setItem(userKey, JSON.stringify([String(orderId), ...saved]));
          }
        }
        if (currentPhone) {
          localStorage.setItem('foodie_customer_phone', currentPhone);
          const phoneKey = `foodie_customer_order_ids_${currentPhone}`;
          const saved = JSON.parse(localStorage.getItem(phoneKey) || '[]');
          if (!saved.includes(String(orderId))) {
            localStorage.setItem(phoneKey, JSON.stringify([String(orderId), ...saved]));
          }
        }
        if (!currentUserId && !currentPhone) {
          const guestSaved = JSON.parse(localStorage.getItem('foodie_guest_order_ids') || '[]');
          if (!guestSaved.includes(String(orderId))) {
            localStorage.setItem('foodie_guest_order_ids', JSON.stringify([String(orderId), ...guestSaved]));
          }
        }

        window.dispatchEvent(new CustomEvent('foodie_orders_updated', { detail: { orderId } }));
        localStorage.setItem('foodie_orders_sync_trigger', now.toString());
      } catch (e) { }
    }
  }, [orderId, totalAmount, tableDisplay]);

  const handleCancelOrder = async () => {
    if (!isEmployee) {
      alert("Order is already confirmed and sent to the kitchen. Cancellation is disabled.");
      return;
    }
    if (window.confirm(`Are you sure you want to cancel Order #${order.id}?`)) {
      setLoadingAction(true);
      try {
        await orderService.updateOrderStatus(order.id, 'Cancelled');
        setOrderStatus('Cancelled');
        alert(`Order #${order.id} has been cancelled successfully.`);
      } catch (e) {
        console.error("Failed to cancel order:", e);
        alert("Failed to cancel order. Please try again.");
      }
      setLoadingAction(false);
    }
  };

  const handleChangeOrder = async () => {
    if (!isEmployee) {
      alert("Order is already confirmed and sent to the kitchen. Modification is disabled.");
      return;
    }
    if (window.confirm(`Would you like to modify Order #${order.id}? This will cancel current order and load items into your cart.`)) {
      setLoadingAction(true);
      try {
        await orderService.updateOrderStatus(order.id, 'Cancelled');
        setOrderStatus('Cancelled');
        if (order.items && order.items.length > 0) {
          loadOrderIntoCart(order.items);
        }
        navigate('/customer/cart');
      } catch (e) {
        console.error("Failed to modify order:", e);
        navigate('/customer/cart');
      }
      setLoadingAction(false);
    }
  };

  return (
    <CustomerLayout>
      <main className="pt-4 text-center mx-auto" style={{ maxWidth: '600px' }}>
        <div className="text-start mb-3">
          <BackButton to="/customer/home" />
        </div>
        <div
          className="d-flex align-items-center justify-content-center mb-4 rounded-circle mx-auto animate-pulse"
          style={{
            width: '90px',
            height: '90px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-color)',
            border: '2px solid var(--primary-color)'
          }}
        >
          <FiCheckCircle size={44} className="text-danger" />
        </div>

        <h3 className="fw-bold text-dark mb-1">
          {orderStatus === 'Cancelled' ? 'Order Cancelled' : 'Order Confirmed!'}
        </h3>
        {/* <p className="text-muted small mb-4">
          {orderStatus === 'Cancelled' 
            ? 'This order has been cancelled and is not active.' 
            : 'Your order is accepted and sent to the kitchen.'
          }
        </p> */}

        {/* Details Card */}
        <div className="card rounded-3 border-0 shadow-sm p-3 bg-white text-start mb-4">
          <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-light">
            <span className="text-secondary small">Order ID</span>
            <span className="fw-bold text-dark font-monospace">#{backendOrderId}</span>
          </div>

          <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-light">
            <span className="text-secondary small">Status</span>
            <span className={`fw-bold text-uppercase ${orderStatus === 'Cancelled' ? 'text-danger' : 'text-success'}`}>
              {orderStatus}
            </span>
          </div>

          <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-light">
            <span className="text-secondary small">Order Type</span>
            <span className="fw-bold text-dark">{order?.orderType || (tableDisplay === 'Takeaway' ? 'Takeaway' : 'Dine-In')}</span>
          </div>

          {tableDisplay !== 'Takeaway' && (
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-light">
              <span className="text-secondary small">Dining Table</span>
              <span className="fw-bold text-dark">{tableDisplay}</span>
            </div>
          )}

          {(order?.packingCharge > 0 || order?.packing_charge > 0 || order?.orderType === 'Takeaway' || tableDisplay === 'Takeaway') && (
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-light">
              <span className="text-secondary small">Packing Charges (Takeaway)</span>
              <span className="fw-bold text-dark">+{formatCurrency(order?.packingCharge || order?.packing_charge || (((order?.items || []).reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || 1) * 15))}</span>
            </div>
          )}

          {voucherCode && (
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-light">
              <span className="text-secondary small">Voucher Applied</span>
              <span className="fw-bold text-success font-monospace">{voucherCode}</span>
            </div>
          )}

          <div className="d-flex align-items-center justify-content-between pb-3 border-bottom border-light">
            <span className="text-secondary small">Total Paid Amount</span>
            <span className="fw-bold text-danger">{formatCurrency(totalAmount)}</span>
          </div>



          <div className="pt-3 border-top border-light d-flex gap-2">
            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="btn btn-outline-danger w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-xs"
            >
              <i className="bi bi-receipt"></i>
              <span>View E-Bill / Receipt</span>
            </button>
            
            {(() => {
              const pm = order?.payment?.method || order?.paymentMethod || order?.payment_method || 'Pay on Counter';
              const pStatus = order?.payment?.status || order?.paymentStatus || order?.payment_status || 'Pending';
              
              const isOnlinePayment = ['card', 'upi'].includes(String(pm).toLowerCase());
              const isPaymentSuccess = ['SUCCESS', 'COMPLETED', 'PAID'].includes(String(pStatus).toUpperCase());
              
              if (isOnlinePayment && isPaymentSuccess) {
                return (
                  <button
                    type="button"
                    onClick={handleDownloadEBill}
                    disabled={downloadingPdf}
                    className="btn btn-danger w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-xs"
                    style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}
                  >
                    <FiDownload size={16} />
                    <span>{downloadingPdf ? 'Generating...' : 'Download PDF'}</span>
                  </button>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Main Action CTAs */}
        <div className="row g-3">
          {isEmployee ? (
            <div className="d-flex flex-column gap-2 w-100">
              <Button
                onClick={() => navigate('/admin/kitchen')}
                variant="primary"
                className="w-100 py-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                style={{ fontSize: '15px', backgroundColor: '#dc3545', borderColor: '#dc3545' }}
              >
                <i className="bi bi-fire fs-5"></i> Go to Kitchen Queue
              </Button>
              <div className="row g-2">
                <div className="col-6">
                  <Button onClick={() => navigate('/admin/tables')} variant="outline" className="w-100 py-2.5 fw-bold border-secondary text-dark">
                    Go to Tables
                  </Button>
                </div>
                <div className="col-6">
                  <Button onClick={() => navigate('/customer/home')} variant="secondary" className="w-100 py-2.5 fw-bold">
                    Take New Order
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="col-6">
                <Button onClick={() => navigate(`/customer/order-tracking/${backendOrderId}`, { state: { order: { ...(order || {}), id: backendOrderId, total: totalAmount, status: orderStatus, table: tableDisplay } } })} variant="primary" className="w-100 py-2.5 fw-bold shadow-sm">
                  Track Order #{backendOrderId}
                </Button>
              </div>
              <div className="col-6">
                <Button onClick={() => navigate('/customer/home')} variant="secondary" className="w-100 py-2.5 fw-bold shadow-sm">
                  Go to Menu
                </Button>
              </div>
            </>
          )}
        </div>
        
        {/* Extra spacing to ensure buttons are fully visible above mobile navigation */}
        <div style={{ height: '40px' }} className="d-md-none w-100"></div>
      </main>

      <EBillModal
        isOpen={showReceiptModal}
        order={order}
        onClose={() => setShowReceiptModal(false)}
      />
    </CustomerLayout>
  );
};

export default OrderConfirmation;

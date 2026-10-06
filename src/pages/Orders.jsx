import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import BottomNavigation from '../components/layout/BottomNavigation';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import EBillModal from '../components/orders/EBillModal';

export const Orders = () => {
  const navigate = useNavigate();
  const { orders } = useCart();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-success-subtle text-success border-success-subtle';
      case 'Preparing':
        return 'bg-warning-subtle text-warning-emphasis border-warning-subtle';
      case 'Out for Delivery':
        return 'bg-info-subtle text-info-emphasis border-info-subtle';
      case 'Delivered':
        return 'bg-success text-white border-success';
      case 'Cancelled':
        return 'bg-danger-subtle text-danger border-danger-subtle';
      default:
        return 'bg-light text-secondary border-light-subtle';
    }
  };

  if (orders.length === 0) {
    return (
      <div className="d-flex flex-column min-vh-100 bg-light">
        <Header />
        <main className="container py-5 flex-grow-1 px-3 d-flex align-items-center justify-content-center">
          <div className="card shadow-sm border-0 p-4 bg-white rounded-4 w-100" style={{ maxWidth: '450px' }}>
            <EmptyState
              title="No Previous Orders"
              description="You haven't ordered anything yet. Browse our menu to place your first order!"
              icon="bi-clock-history"
              buttonText="Order Delicious Food"
              onButtonClick={() => navigate('/home')}
            />
          </div>
        </main>
        <Footer />
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Header />

      <main className="container py-4 flex-grow-1 px-3">
        <h4 className="fw-bold mb-4 text-dark">Order History</h4>

        <div className="row justify-content-center">
          <div className="col-12 col-lg-9">
            {orders.map((order) => {
              const itemsList = order.items.map((i) => `${i.name} x${i.quantity}`).join(', ');
              return (
                <div key={order.id} className="card rounded-3 p-4 mb-3 shadow-sm border-0 bg-white">
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center border-bottom pb-3 mb-3 gap-2">
                    <div>
                      <span className="fw-bold text-dark fs-5">Order #{order.id}</span>
                      <div className="text-muted small mt-1">Placed on {order.date}</div>
                    </div>
                    
                    <span className={`badge border px-3 py-2 rounded-pill fw-bold ${getStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="row align-items-center">
                    <div className="col-12 col-md-8 mb-3 mb-md-0">
                      <div className="text-secondary small fw-semibold">ITEMS ordered</div>
                      <div className="fw-bold text-dark text-truncate mt-1" style={{ maxWidth: '450px' }}>
                        {itemsList}
                      </div>
                      <div className="text-muted small mt-2">
                        Payment: <strong>{order.paymentMethod}</strong>
                      </div>
                    </div>

                    <div className="col-12 col-md-4 text-start text-md-end">
                      <div className="text-secondary small">Total Paid</div>
                      <div className="fw-extrabold text-danger fw-bold fs-4 mb-2">₹{order.total}</div>
                      <div className="d-flex align-items-center justify-content-md-end gap-2">
                        <button 
                          onClick={() => setSelectedOrder(order)} 
                          className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold"
                        >
                          View Details
                        </button>
                        {String(order.status || '').toLowerCase() === 'completed' && (
                          <button
                            onClick={() => {
                              setReceiptOrder(order);
                              setShowReceiptModal(true);
                            }}
                            className="btn btn-danger btn-sm rounded-pill px-3 fw-bold text-white d-flex align-items-center gap-1"
                            style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}
                          >
                            <i className="bi bi-receipt"></i> View Bill
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal for Order Details */}
        {selectedOrder && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 p-3">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold text-dark">Order Details ( #{selectedOrder.id} )</h5>
                  <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)} aria-label="Close"></button>
                </div>
                <div className="modal-body py-3">
                  <div className="border-bottom pb-3 mb-3">
                    <span className="text-muted small d-block">Placed on</span>
                    <span className="fw-bold text-dark">{selectedOrder.date}</span>
                  </div>

                  <h6 className="fw-bold text-dark mb-2">Items</h6>
                  <div className="bg-light p-3 rounded-3 mb-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="d-flex align-items-center justify-content-between mb-2 small">
                        <span className="text-dark">{item.name} <strong>x{item.quantity}</strong></span>
                        <span className="fw-bold text-dark">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <h6 className="fw-bold text-dark mb-2">Bill Summary</h6>
                  <div className="small">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-secondary">Subtotal</span>
                      <span className="text-dark">₹{selectedOrder.subtotal}</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-secondary">Delivery Fee</span>
                      <span className="text-dark">
                        {selectedOrder.deliveryFee === 0 ? 'FREE' : `₹${selectedOrder.deliveryFee}`}
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-secondary">Taxes</span>
                      <span className="text-dark">₹{selectedOrder.tax}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="d-flex align-items-center justify-content-between mb-1 text-success">
                        <span>Discount</span>
                        <span className="fw-bold">-₹{selectedOrder.discount}</span>
                      </div>
                    )}
                    <div className="d-flex align-items-center justify-content-between border-top pt-2 mt-2 fw-bold text-danger fs-5">
                      <span>Total Paid</span>
                      <span>₹{selectedOrder.total}</span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <Button onClick={() => setSelectedOrder(null)} variant="primary" className="w-100">
                    Close Details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <EBillModal
        isOpen={showReceiptModal}
        order={receiptOrder}
        onClose={() => {
          setShowReceiptModal(false);
          setReceiptOrder(null);
        }}
      />

      <Footer />
      <BottomNavigation />
    </div>
  );
};

export default Orders;

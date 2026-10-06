import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import formatCurrency from '../../utils/formatCurrency';
import BackButton from '../../components/common/BackButton';

export const Checkout = () => {
  const navigate = useNavigate();
  const { 
    cartItems,
    loadOrderIntoCart,
    tableContext, 
    setTable, 
    getSubtotal, 
    getItemDiscounts, 
    getExtraCharges,
    getPackingCharge,
    getTax,
    getServiceCharge,
    isServiceChargeRemoved,
    toggleServiceChargeRemoval,
    getDeliveryFee, 
    getDiscount, 
    getGrandTotal,
    coupon,
    getEffectiveItems
  } = useCart();
  const { user } = useAuth();

  const [orderType, setOrderType] = useState(() => {
    const saved = sessionStorage.getItem('foodie_order_type') || localStorage.getItem('foodie_order_type');
    if (saved === 'TAKEAWAY' || tableContext?.tableNumber === 'Takeaway') return 'TAKEAWAY';
    return 'TABLE';
  });
  const [diners, setDiners] = useState(tableContext ? String(tableContext.diners || 2) : '2');

  const isTakeaway = orderType === 'TAKEAWAY';

  const handleOrderTypeChange = (newType) => {
    setOrderType(newType);
    sessionStorage.setItem('foodie_order_type', newType);
    localStorage.setItem('foodie_order_type', newType);
    if (newType === 'TAKEAWAY') {
      setTable({ tableNumber: 'Takeaway', tableId: 'Takeaway', orderType: 'TAKEAWAY' });
    }
  };

  const effectiveCartItems = typeof getEffectiveItems === 'function' ? getEffectiveItems() : (cartItems || []);

  const handleProceedToPay = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    try {
      const dinersNum = parseInt(diners, 10) || 2;
      sessionStorage.setItem('foodie_order_type', orderType);
      localStorage.setItem('foodie_order_type', orderType);
      if (orderType === 'TABLE') {
        const savedTable = JSON.parse(sessionStorage.getItem('foodie_table') || 'null');
        const rawNum = tableContext?.tableNumber || savedTable?.tableNumber || 'T01';
        const canonNum = String(rawNum).startsWith('T') ? rawNum : (rawNum === '1' ? 'T01' : (rawNum === '2' ? 'T02' : (rawNum === '3' ? 'T03' : (rawNum === '4' ? 'T04' : `T0${rawNum}`))));
        const activeTable = {
          ...(tableContext || savedTable || {}),
          tableNumber: canonNum,
          tableId: (tableContext?.tableId || savedTable?.tableId || canonNum),
          diners: dinersNum
        };
        setTable(activeTable);
        sessionStorage.setItem('foodie_table', JSON.stringify(activeTable));
      } else {
        const takeawayContext = { tableNumber: 'Takeaway', tableId: 'Takeaway', orderType: 'TAKEAWAY' };
        setTable(takeawayContext);
        sessionStorage.setItem('foodie_table', JSON.stringify(takeawayContext));
      }

      if (effectiveCartItems && effectiveCartItems.length > 0) {
        sessionStorage.setItem('foodie_cart', JSON.stringify(effectiveCartItems));
      }
    } catch (err) {
      console.error("Error setting table in checkout:", err);
    }

    navigate('/customer/payment', { state: { orderType, diners } });
  };

  if (!effectiveCartItems || effectiveCartItems.length === 0) {
    return (
      <CustomerLayout>
        <main className="px-3 pt-5 text-center">
          <div className="card rounded-4 border-0 shadow-sm p-4 bg-white mx-auto" style={{ maxWidth: '420px' }}>
            <h5 className="fw-bold text-dark mb-2">Your Cart is Empty</h5>
            <p className="text-secondary small mb-3">Add items from the menu before proceeding to checkout.</p>
            <Button onClick={() => navigate('/customer/home')} variant="primary" className="py-2.5">
              Browse Menu
            </Button>
          </div>
        </main>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <main className="pt-2">
        <div className="d-flex align-items-center gap-3 mb-4">
          <BackButton />
          <h4 className="fw-bold text-dark mb-0">Checkout Details</h4>
        </div>

        <form onSubmit={handleProceedToPay}>
          <div className="row g-4">
            {/* Left Column: Option Configs & Item Summary */}
            <div className="col-12 col-lg-8">
              <div className="card rounded-3 border-0 shadow-sm p-3 p-sm-4 bg-white text-start mb-4">
                <h5 className="fw-bold text-dark mb-3">Service Option</h5>


                {orderType === 'TABLE' && (
                  <div className="p-3 bg-light rounded-3 border border-light-subtle">
                    <span className="small text-secondary fw-semibold">Table Location:</span>
                    <h6 className="fw-bold text-dark mb-0">
                      Table {tableContext?.tableNumber ? (String(tableContext.tableNumber).startsWith('T') ? tableContext.tableNumber : `T0${tableContext.tableNumber}`) : 'T01'}
                    </h6>
                  </div>
                )}
                {orderType === 'TAKEAWAY' && (
                  <div className="p-3 bg-light rounded-3 border border-light-subtle d-flex align-items-center justify-content-between">
                    <div>
                      <span className="small text-secondary fw-semibold">Order Fulfillment:</span>
                      <h6 className="fw-bold text-danger mb-0">Takeaway Counter Pickup</h6>
                    </div>
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1.5 rounded-pill fw-bold" style={{ fontSize: '11px' }}>
                      +₹{getPackingCharge(true)} Packing Fee
                    </span>
                  </div>
                )}
              </div>

              {/* Item Summary with Special Instructions */}
              <div className="card rounded-3 border-0 shadow-sm p-3 p-sm-4 bg-white text-start">
                <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Item Summary</h5>
                <div className="d-flex flex-column gap-3">
                  {effectiveCartItems.map((item) => (
                    <div key={item.id} className="d-flex align-items-start justify-content-between pb-3 border-bottom border-light-subtle">
                      <div>
                        <h6 className="fw-bold text-dark mb-0.5">{item.name} <span className="text-secondary small">x{item.quantity}</span></h6>
                        {item.instructions && (
                          <div className="small text-danger fw-semibold" style={{ fontSize: '11px' }}>
                            Instructions: "{item.instructions}"
                          </div>
                        )}
                        {item.extraIngredients && item.extraIngredients.length > 0 && (
                          <div className="small text-success fw-semibold" style={{ fontSize: '11px' }}>
                            Extras: {item.extraIngredients.map(e => `${e.name} (+₹${e.price})`).join(', ')}
                          </div>
                        )}
                      </div>
                      <span className="fw-bold text-dark">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Pricing Summary & Submit */}
            <div className="col-12 col-lg-4">
              <div className="card rounded-3 border-0 shadow-sm p-3 p-sm-4 bg-white mb-4 text-start">
                <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Order Bill Summary</h5>
                
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-secondary small">Items Total</span>
                  <span className="fw-bold text-dark">{formatCurrency(getSubtotal(isTakeaway))}</span>
                </div>

                {getExtraCharges(isTakeaway) > 0 && (
                  <div className="d-flex align-items-center justify-content-between mb-2 text-danger">
                    <span className="small">Extra Charges</span>
                    <span className="fw-bold">+{formatCurrency(getExtraCharges(isTakeaway))}</span>
                  </div>
                )}

                {getPackingCharge(isTakeaway) > 0 && (
                  <div className="d-flex align-items-center justify-content-between mb-2 text-dark">
                    <span className="text-secondary small">Packing Charges (Takeaway)</span>
                    <span className="fw-bold text-dark">+{formatCurrency(getPackingCharge(isTakeaway))}</span>
                  </div>
                )}
                
                {getItemDiscounts(isTakeaway) > 0 && (
                  <div className="d-flex align-items-center justify-content-between mb-2 text-success">
                    <span className="small">Menu Discounts</span>
                    <span className="fw-bold">-{formatCurrency(getItemDiscounts(isTakeaway))}</span>
                  </div>
                )}

                {getDiscount(isTakeaway) > 0 && (
                  <div className="d-flex align-items-center justify-content-between mb-2 text-success">
                    <span className="small">Coupon Discount</span>
                    <span className="fw-bold">-{formatCurrency(getDiscount(isTakeaway))}</span>
                  </div>
                )}

                {coupon && (
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-secondary small">Voucher Applied</span>
                    <span className="fw-bold text-success font-monospace">{coupon.code || coupon}</span>
                  </div>
                )}
                
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-secondary small">Tax/GST (5%)</span>
                  <span className="fw-bold text-dark">{formatCurrency(getTax(isTakeaway))}</span>
                </div>

                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-1.5">
                    <span className="text-secondary small">Service Charge (2%)</span>
                  </div>
                  <span className={`fw-bold ${isServiceChargeRemoved ? 'text-muted text-decoration-line-through' : 'text-dark'}`}>
                    {isServiceChargeRemoved ? '₹0' : formatCurrency(getServiceCharge(isTakeaway))}
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between my-3 pt-3 border-top fw-bold fs-5 text-dark">
                  <span>Payable Amount</span>
                  <span className="text-danger fw-bold fs-4">{formatCurrency(getGrandTotal(isTakeaway))}</span>
                </div>
                
                <div className="d-grid gap-2">
                  <Button 
                    type="button" 
                    onClick={handleProceedToPay} 
                    variant="primary" 
                    className="py-2.5 fw-bold shadow-sm"
                  >
                    Proceed to Payment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </CustomerLayout>
  );
};

export default Checkout;

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import { useCart } from '../../hooks/useCart';
import Button from '../../components/common/Button';
import BackButton from '../../components/common/BackButton';
import Input from '../../components/common/Input';
import formatCurrency from '../../utils/formatCurrency';
import { FiCreditCard, FiSmartphone, FiDollarSign } from 'react-icons/fi';

export const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    cartItems,
    clearCart,
    tableContext,
    getSubtotal,
    getExtraCharges,
    getPackingCharge,
    getItemDiscounts, 
    getTax, 
    getServiceCharge,
    isServiceChargeRemoved,
    toggleServiceChargeRemoval,
    getDeliveryFee, 
    getDiscount, 
    getGrandTotal, 
    coupon, 
    submitOrder 
  } = useCart();

  const orderType = location.state?.orderType || sessionStorage.getItem('foodie_order_type') || (tableContext?.tableNumber === 'Takeaway' ? 'TAKEAWAY' : 'TABLE');
  const isTakeaway = orderType === 'TAKEAWAY';

  const [paymentMethod, setPaymentMethod] = useState('COD'); // Default: Pay on Counter / COD
  const [loading, setLoading] = useState(false);

  // Form parameters
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [errors, setErrors] = useState({});

  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
    setErrors({});
  };

  const handleCardNameChange = (e) => {
    setCardName(e.target.value);
    if (errors.cardName) {
      setErrors(prev => ({ ...prev, cardName: undefined }));
    }
  };

  const handleCardNumberChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = rawVal.match(/.{1,4}/g)?.join(' ') || rawVal;
    setCardNumber(formatted);
    if (errors.cardNumber) {
      setErrors(prev => ({ ...prev, cardNumber: undefined }));
    }
  };

  const handleExpiryChange = (e) => {
    let rawVal = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (rawVal.length >= 3) {
      rawVal = `${rawVal.slice(0, 2)}/${rawVal.slice(2, 4)}`;
    }
    setExpiry(rawVal);
    if (errors.expiry) {
      setErrors(prev => ({ ...prev, expiry: undefined }));
    }
  };

  const handleCvvChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvv(rawVal);
    if (errors.cvv) {
      setErrors(prev => ({ ...prev, cvv: undefined }));
    }
  };

  const handleUpiChange = (e) => {
    setUpiId(e.target.value);
    if (errors.upiId) {
      setErrors(prev => ({ ...prev, upiId: undefined }));
    }
  };

  const validatePaymentCredentials = (method) => {
    const newErrors = {};

    if (method === 'CARD') {
      if (!cardName.trim()) {
        newErrors.cardName = 'Please enter cardholder name';
      }

      const cleanCardNumber = cardNumber.replace(/\s+/g, '');
      if (!cleanCardNumber) {
        newErrors.cardNumber = 'Please enter card number';
      } else if (!/^\d{16}$/.test(cleanCardNumber)) {
        newErrors.cardNumber = 'Card number must be 16 digits';
      }

      if (!expiry.trim()) {
        newErrors.expiry = 'Please enter expiry date (MM/YY)';
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.trim())) {
        newErrors.expiry = 'Enter valid MM/YY (e.g. 12/28)';
      } else {
        const [expMonth, expYear] = expiry.trim().split('/').map(Number);
        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          newErrors.expiry = 'Card has expired';
        }
      }

      const cleanCvv = cvv.replace(/\s+/g, '');
      if (!cleanCvv) {
        newErrors.cvv = 'Please enter CVV';
      } else if (!/^\d{3,4}$/.test(cleanCvv)) {
        newErrors.cvv = 'CVV must be 3 or 4 digits';
      }
    } else if (method === 'UPI') {
      const cleanUpi = upiId.trim();
      if (!cleanUpi) {
        newErrors.upiId = 'Please enter your UPI ID';
      } else if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/.test(cleanUpi)) {
        newErrors.upiId = 'Please enter a valid UPI ID (e.g. username@okhdfcbank or 9876543210@paytm)';
      }
    }

    return newErrors;
  };

  const handlePaySubmit = async (e, chosenMethod = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (loading) return;

    let methodToUse = paymentMethod || 'COD';
    if (typeof e === 'string') {
      methodToUse = e;
    } else if (typeof chosenMethod === 'string' && chosenMethod) {
      methodToUse = chosenMethod;
    }

    // Validate credentials for the selected payment method
    const validationErrors = validatePaymentCredentials(methodToUse);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const grandTotalSnapshot = getGrandTotal(isTakeaway);
      const subtotalSnapshot = getSubtotal(isTakeaway);
      const order = await submitOrder(methodToUse, orderType);
      
      const orderTotal = parseFloat(order?.total ?? order?.total_amount ?? 0);
      const guaranteedOrder = {
        ...(order || {}),
        status: 'Pending',
        packingCharge: getPackingCharge(isTakeaway),
        packing_charge: getPackingCharge(isTakeaway),
        total: orderTotal > 0 ? orderTotal : (grandTotalSnapshot > 0 ? grandTotalSnapshot : subtotalSnapshot)
      };

      try {
        sessionStorage.setItem('foodie_last_placed_order', JSON.stringify(guaranteedOrder));
        localStorage.setItem('foodie_last_placed_order', JSON.stringify(guaranteedOrder));
        if (guaranteedOrder.id) {
          localStorage.setItem(`foodie_saved_order_${guaranteedOrder.id}`, JSON.stringify(guaranteedOrder));
          const existingAll = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
          const filteredExisting = existingAll.filter(o => String(o.id || o.order_id) !== String(guaranteedOrder.id));
          localStorage.setItem('foodie_all_placed_orders', JSON.stringify([guaranteedOrder, ...filteredExisting]));
        }
        window.dispatchEvent(new CustomEvent('foodie_orders_updated', { detail: { orderId: guaranteedOrder.id } }));
        localStorage.setItem('foodie_orders_sync_trigger', Date.now().toString());
      } catch (e) {}

      const isPaidOnline = methodToUse === 'CARD' || methodToUse === 'UPI';
      setLoading(false);
      navigate('/customer/order-confirmation', { 
        state: { 
          order: guaranteedOrder, 
          autoShowReceipt: isPaidOnline,
          paymentSuccessMessage: isPaidOnline ? 'Payment Successful!' : undefined 
        } 
      });
    } catch (err) {
      console.error('Payment / Order placement error:', err);
      setLoading(false);
      const msg = err.response?.data?.state?.description || err.response?.data?.message || err.message || 'Unable to place order on the backend server. Please try again.';
      alert(`Order Placement Failed: ${msg}`);
    }
  };

  return (
    <CustomerLayout>
      <main className="pt-2">
        <div className="d-flex align-items-center gap-3 mb-4">
          <BackButton />
          <h4 className="fw-bold text-dark mb-0">Select Payment</h4>
        </div>

        <form onSubmit={handlePaySubmit}>
          <div className="row g-4">
            {/* Left Column: Form Fields */}
            <div className="col-12 col-lg-8">
              <div className="card rounded-3 border-0 shadow-sm p-3 p-sm-4 bg-white">
                <h5 className="fw-bold text-dark mb-3">Payment Options</h5>

                {/* Card Option */}
                <div 
                  onClick={() => !loading && handleSelectPaymentMethod('CARD')}
                  className={`d-flex align-items-center justify-content-between p-3 border rounded-3 mb-3 cursor-pointer transition-all ${paymentMethod === 'CARD' ? 'border-danger bg-light-subtle shadow-xs' : 'border-light'}`}
                  style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  <div className="d-flex align-items-center">
                    <FiCreditCard size={20} className="text-secondary me-3 flex-shrink-0" />
                    <div>
                      <div className="fw-bold text-dark">Credit / Debit Card</div>
                      <div className="text-muted small" style={{ fontSize: '11px' }}>Visa, Mastercard, RuPay accepted</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'CARD'} 
                      onChange={() => !loading && handleSelectPaymentMethod('CARD')} 
                      className="form-check-input accent-red" 
                      disabled={loading}
                    />
                  </div>
                </div>

                {paymentMethod === 'CARD' && (
                  <div className="p-3 border rounded-3 bg-light-subtle mb-3">
                    <div className="row g-3">
                      <div className="col-12">
                        <Input 
                          label="Cardholder Name" 
                          placeholder="e.g. Rahul Sharma" 
                          value={cardName} 
                          onChange={handleCardNameChange} 
                          error={errors.cardName}
                          required
                        />
                      </div>
                      <div className="col-12">
                        <Input 
                          label="Card Number" 
                          placeholder="1234 5678 9012 3456" 
                          value={cardNumber} 
                          onChange={handleCardNumberChange} 
                          maxLength={19}
                          error={errors.cardNumber}
                          required
                        />
                      </div>
                      <div className="col-6">
                        <Input 
                          label="Expiry Date" 
                          placeholder="MM/YY" 
                          value={expiry} 
                          onChange={handleExpiryChange} 
                          maxLength={5}
                          error={errors.expiry}
                          required
                        />
                      </div>
                      <div className="col-6">
                        <Input 
                          label="CVV" 
                          placeholder="123" 
                          type="password" 
                          value={cvv} 
                          onChange={handleCvvChange} 
                          maxLength={4}
                          error={errors.cvv}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* UPI Option */}
                <div 
                  onClick={() => !loading && handleSelectPaymentMethod('UPI')}
                  className={`d-flex align-items-center justify-content-between p-3 border rounded-3 mb-3 cursor-pointer transition-all ${paymentMethod === 'UPI' ? 'border-danger bg-light-subtle shadow-xs' : 'border-light'}`}
                  style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  <div className="d-flex align-items-center">
                    <FiSmartphone size={20} className="text-secondary me-3 flex-shrink-0" />
                    <div>
                      <div className="fw-bold text-dark">UPI Instant Payment</div>
                      <div className="text-muted small" style={{ fontSize: '11px' }}>Google Pay, PhonePe, Paytm, BHIM</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'UPI'} 
                      onChange={() => !loading && handleSelectPaymentMethod('UPI')} 
                      className="form-check-input accent-red" 
                      disabled={loading}
                    />
                  </div>
                </div>

                {paymentMethod === 'UPI' && (
                  <div className="p-3 border rounded-3 bg-light-subtle mb-3">
                    <Input 
                      label="UPI ID / VPA" 
                      placeholder="e.g. username@okhdfcbank or 9876543210@paytm" 
                      value={upiId} 
                      onChange={handleUpiChange} 
                      error={errors.upiId}
                      required
                    />
                    <span className="text-muted small d-block mt-1" style={{ fontSize: '11px' }}>
                      Supported apps: Google Pay, PhonePe, Paytm, BHIM, and all UPI apps
                    </span>
                  </div>
                )}

                <div 
                  onClick={() => !loading && handleSelectPaymentMethod('COD')}
                  className={`d-flex align-items-center justify-content-between p-3 border rounded-3 cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-danger bg-light-subtle shadow-xs' : 'border-light'}`}
                  style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  <div className="d-flex align-items-center">
                    <FiDollarSign size={20} className="text-secondary me-3 flex-shrink-0" />
                    <div>
                      <div className="fw-bold text-dark">Cash on Delivery / Pay at Counter</div>
                      <div className="text-muted small" style={{ fontSize: '11px' }}>Pay with cash or card directly at the restaurant counter</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'COD'} 
                      onChange={() => !loading && handleSelectPaymentMethod('COD')} 
                      className="form-check-input accent-red" 
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Bill Summary */}
            <div className="col-12 col-lg-4">
              {/* Detailed Bill Summary Card */}
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
                    <span className="small text-secondary">Packing Charges (Takeaway)</span>
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
                    type="submit" 
                    variant="primary" 
                    loading={loading} 
                    className="py-2.5 fw-bold shadow-sm"
                  >
                    {loading ? (paymentMethod === 'COD' ? 'Confirming Order...' : 'Processing Payment...') : 'Make Payment'}
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

export default Payment;

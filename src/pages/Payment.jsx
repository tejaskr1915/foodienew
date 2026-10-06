import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import BottomNavigation from '../components/layout/BottomNavigation';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { extractApiErrorMessage } from '../utils/errorUtils';

export const Payment = () => {
  const navigate = useNavigate();
  const {
    getCartSubtotal,
    getCartTax,
    getCartDeliveryFee,
    getCartDiscount,
    getCartGrandTotal,
    placeOrder
  } = useCart();

  const [paymentMethod, setPaymentMethod] = useState('card'); // card, upi, cod
  const [loading, setLoading] = useState(false);

  // Card form states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // UPI form states
  const [upiId, setUpiId] = useState('');

  // Validation errors
  const [cardErrors, setCardErrors] = useState({});
  const [upiError, setUpiError] = useState('');

  const subtotal = getCartSubtotal();
  const tax = getCartTax();
  const deliveryFee = getCartDeliveryFee();
  const discount = getCartDiscount();
  const total = getCartGrandTotal();

  const validate = () => {
    let isValid = true;
    setCardErrors({});
    setUpiError('');

    if (paymentMethod === 'card') {
      const errors = {};
      if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        errors.cardNumber = 'Please enter a valid 16-digit card number';
        isValid = false;
      }
      if (!cardName.trim()) {
        errors.cardName = 'Cardholder name is required';
        isValid = false;
      }
      if (!cardExpiry || !cardExpiry.includes('/')) {
        errors.cardExpiry = 'Expiry date (MM/YY) is required';
        isValid = false;
      }
      if (!cardCvv || cardCvv.length < 3) {
        errors.cardCvv = 'Valid CVV is required';
        isValid = false;
      }

      setCardErrors(errors);
    } else if (paymentMethod === 'upi') {
      if (!upiId) {
        setUpiError('UPI ID is required');
        isValid = false;
      } else if (!upiId.includes('@')) {
        setUpiError('Please enter a valid UPI ID (e.g. user@upi)');
        isValid = false;
      }
    }

    return isValid;
  };

  const handlePay = async (e, chosenMethod = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (loading) return;
    const methodToUse = chosenMethod || paymentMethod;
    if (methodToUse === 'card' || methodToUse === 'upi') {
      if (!validate()) return;
    }

    setLoading(true);
    try {
      const order = await placeOrder(methodToUse.toUpperCase());
      if (!order || !order.id) {
        throw new Error("Order creation did not return a valid numeric order ID.");
      }

      navigate('/customer/order-confirmation', { 
        state: { 
          order 
        } 
      });
    } catch (err) {
      console.error("Order placement failed in Payment.jsx:", err);
      const msg = extractApiErrorMessage(err, "Failed to place order. Please try again.");
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Header />

      <main className="container py-4 flex-grow-1 px-3">
        <h4 className="fw-bold mb-4 text-dark">Checkout & Payment</h4>

        <div className="row g-4">
          {/* Payment Methods Options */}
          <div className="col-12 col-lg-8">
            <div className="card rounded-3 p-4 shadow-sm border-0 bg-white mb-4">
              <h5 className="fw-bold text-dark mb-4">Select Payment Method</h5>

              {/* Card option */}
              <div 
                onClick={() => setPaymentMethod('card')}
                className={`d-flex align-items-center p-3 mb-3 border rounded-3 cursor-pointer transition-all ${
                  paymentMethod === 'card' ? 'border-danger bg-light' : 'border-light'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  checked={paymentMethod === 'card'} 
                  onChange={() => setPaymentMethod('card')}
                  className="form-check-input accent-red me-3"
                />
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="fw-bold text-dark">Credit / Debit Card</div>
                  <i className="bi bi-credit-card text-muted fs-4"></i>
                </div>
              </div>

              {paymentMethod === 'card' && (
                <div className="p-3 border rounded-3 bg-light-subtle mb-4">
                  <div className="row">
                    <div className="col-12">
                      <Input
                        label="Cardholder Name"
                        placeholder="Enter owner name"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        error={cardErrors.cardName}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <Input
                        label="Card Number"
                        placeholder="1234 5678 1234 5678"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        error={cardErrors.cardNumber}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <Input
                        label="Expiry Date"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        error={cardErrors.cardExpiry}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <Input
                        label="CVV"
                        placeholder="123"
                        maxLength={3}
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        error={cardErrors.cardCvv}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* UPI option */}
              <div 
                onClick={() => setPaymentMethod('upi')}
                className={`d-flex align-items-center p-3 mb-3 border rounded-3 cursor-pointer transition-all ${
                  paymentMethod === 'upi' ? 'border-danger bg-light' : 'border-light'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  checked={paymentMethod === 'upi'} 
                  onChange={() => setPaymentMethod('upi')}
                  className="form-check-input accent-red me-3"
                />
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="fw-bold text-dark">UPI Payment</div>
                  <i className="bi bi-qr-code text-muted fs-4"></i>
                </div>
              </div>

              {paymentMethod === 'upi' && (
                <div className="p-3 border rounded-3 bg-light-subtle mb-4">
                  <Input
                    label="UPI ID"
                    placeholder="username@bank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    error={upiError}
                    required
                  />
                </div>
              )}

              {/* COD option */}
              <div 
                onClick={() => {
                  setPaymentMethod('cod');
                  handlePay(null, 'cod');
                }}
                className={`d-flex align-items-center p-3 border rounded-3 cursor-pointer transition-all ${
                  paymentMethod === 'cod' ? 'border-danger bg-light' : 'border-light'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  checked={paymentMethod === 'cod'} 
                  onChange={() => {
                    setPaymentMethod('cod');
                    handlePay(null, 'cod');
                  }}
                  className="form-check-input accent-red me-3" 
                />
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div>
                    <div className="fw-bold text-dark">Cash on Delivery (COD) / Pay Counter</div>
                    <small className="text-muted" style={{ fontSize: '11px' }}>Click to place and confirm order immediately</small>
                  </div>
                  <i className="bi bi-cash text-muted fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Invoice summary */}
          <div className="col-12 col-lg-4">
            <div className="card rounded-3 p-4 shadow-sm border-0 bg-white">
              <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Checkout Details</h5>
              
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small">Cart Items Subtotal</span>
                <span className="fw-bold text-dark">₹{subtotal}</span>
              </div>
              
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small">Delivery Fee</span>
                <span className="fw-bold text-dark">
                  {deliveryFee === 0 ? <span className="text-success">FREE</span> : `₹${deliveryFee}`}
                </span>
              </div>
              
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small">Taxes (5%)</span>
                <span className="fw-bold text-dark">₹{tax}</span>
              </div>

              {discount > 0 && (
                <div className="d-flex align-items-center justify-content-between mb-2 text-success">
                  <span className="small">Voucher Discount</span>
                  <span className="fw-bold">-₹{discount}</span>
                </div>
              )}
              
              <div className="d-flex align-items-center justify-content-between my-3 pt-3 border-top fw-bold fs-5 text-dark">
                <span>Total Amount</span>
                <span className="text-danger fw-bold fs-4">₹{total}</span>
              </div>

              <div className="d-grid gap-2 mt-3">
                <Button onClick={handlePay} type="submit" variant="primary" loading={loading} className="py-2.5">
                  Confirm & Pay ₹{total}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
};

export default Payment;

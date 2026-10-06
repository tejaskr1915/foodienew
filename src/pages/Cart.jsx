import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import BottomNavigation from '../components/layout/BottomNavigation';
import CartItem from '../components/cart/CartItem';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';

export const Cart = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    getCartSubtotal,
    getCartTax,
    getCartDeliveryFee,
    getCartDiscount,
    getCartGrandTotal,
  } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="d-flex flex-column min-vh-100 bg-light">
        <Header />
        <main className="container py-5 flex-grow-1 px-3 d-flex align-items-center justify-content-center">
          <div className="card shadow-sm border-0 p-4 bg-white rounded-4 w-100" style={{ maxWidth: '450px' }}>
            <EmptyState
              title="Your Cart is Empty"
              description="Add some delicious food items to satisfy your cravings!"
              icon="bi-cart-x"
              buttonText="Browse Food"
              onButtonClick={() => navigate('/home')}
            />
          </div>
        </main>
        <Footer />
        <BottomNavigation />
      </div>
    );
  }

  const subtotal = getCartSubtotal();
  const tax = getCartTax();
  const deliveryFee = getCartDeliveryFee();
  const discount = getCartDiscount();
  const total = getCartGrandTotal();

  const handleCheckout = () => {
    navigate('/payment');
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Header />

      <main className="container py-4 flex-grow-1 px-3">
        <h4 className="fw-bold mb-4 text-dark">My Order</h4>

        <div className="row g-4">
          {/* Cart Items List */}
          <div className="col-12 col-lg-8">
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onIncrease={() => increaseQuantity(item.id)}
                onDecrease={() => decreaseQuantity(item.id)}
                onRemove={() => removeFromCart(item.id)}
              />
            ))}
          </div>

          {/* Cart Invoice Summary */}
          <div className="col-12 col-lg-4">
            <div className="card rounded-3 p-4 shadow-sm border-0 bg-white">
              <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Order Summary</h5>
              
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small">Subtotal</span>
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
                  <span className="small">Promo Discount</span>
                  <span className="fw-bold">-₹{discount}</span>
                </div>
              )}
              
              <div className="d-flex align-items-center justify-content-between my-3 pt-3 border-top fw-bold fs-5 text-dark">
                <span>Grand Total</span>
                <span className="text-danger fw-bold fs-4">₹{total}</span>
              </div>

              {subtotal < 500 && (
                <div className="alert alert-warning py-2 rounded-3 small text-center mb-3 border-0" style={{ fontSize: '11px' }}>
                  Add items worth <strong>₹{500 - subtotal}</strong> more for <strong>FREE Delivery</strong>!
                </div>
              )}

              <div className="d-grid gap-2">
                <Button onClick={handleCheckout} variant="primary" className="py-2.5">
                  Proceed to Checkout
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

export default Cart;

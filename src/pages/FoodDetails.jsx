import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { foodData } from '../data/foodData';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import BottomNavigation from '../components/layout/BottomNavigation';
import QuantityControl from '../components/cart/QuantityControl';
import Button from '../components/common/Button';
import BackButton from '../components/common/BackButton';
import { getImageUrl } from '../utils/imageUtils';

export const FoodDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cartItems, addToCart, increaseQuantity, decreaseQuantity, updateQuantity, removeFromCart } = useCart();

  const [quantity, setQuantity] = useState(1);

  const foodItem = foodData.find((item) => item.id === parseInt(id));

  const existingInCart = cartItems.find((item) => Number(item.id) === Number(foodItem?.id));
  const inCartQuantity = existingInCart ? existingInCart.quantity : 0;
  const isAdded = inCartQuantity > 0;

  if (!foodItem) {
    return (
      <div className="d-flex flex-column min-vh-100 bg-light">
        <Header />
        <div className="container py-5 text-center flex-grow-1">
          <h3>Dish Not Found</h3>
          <p className="text-muted">The food item you requested does not exist.</p>
          <Button onClick={() => navigate('/home')} variant="primary">
            Back to Home
          </Button>
        </div>
        <Footer />
        <BottomNavigation />
      </div>
    );
  }

  const foodType = foodItem.foodType || foodItem.type || 'veg';
  const badgeClass = foodType === 'veg' ? 'veg-badge' : foodType === 'vegan' ? 'vegan-badge' : 'non-veg-badge';
  const isOutOfStock = foodItem ? (foodItem.stock <= 0 || foodItem.status === 'Out of Stock' || foodItem.status === 'OUT_OF_STOCK' || foodItem.is_available === false) : false;

  const handleAddToCart = () => {
    addToCart(foodItem, quantity);
    navigate('/cart');
  };

  const handleBuyNow = () => {
    addToCart(foodItem, quantity);
    navigate('/cart');
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Header />

      <main className="container py-4 flex-grow-1 px-3">
        {/* Back Button */}
        <div className="mb-4">
          <BackButton />
        </div>

        <div className="row g-4 justify-content-center">
          {/* Large Image Column */}
          <div className="col-12 col-md-6 col-lg-5">
            <div className="card rounded-4 overflow-hidden shadow-sm border-0 bg-white">
              <div className="position-relative" style={{ height: '350px' }}>
                <img
                  src={getImageUrl(foodItem.image)}
                  alt={foodItem.name}
                  className="w-100 h-100"
                  style={{ objectFit: 'cover' }}
                  onError={(event) => {
                    console.error('Failed to load food image:', event.currentTarget.src);
                    event.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
                  }}
                />
                {/* Veg/Non-veg/Vegan Overlay */}
                <div className="position-absolute top-0 start-0 m-3 bg-white p-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center">
                  <span className={badgeClass}></span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="col-12 col-md-6 col-lg-6">
            <div className="card rounded-4 p-4 shadow-sm border-0 bg-white h-100 d-flex flex-column justify-content-between">
              <div>
                {/* Category */}
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="badge bg-light text-danger border border-danger-subtle fw-bold rounded-pill px-3 py-1.5" style={{ fontSize: '12px' }}>
                    {foodItem.category}
                  </span>
                </div>

                {/* Name & Price */}
                <h2 className="fw-bold text-dark mt-2 mb-1">{foodItem.name}</h2>
                {(() => {
                  const baseOriginalPrice = parseFloat(foodItem.originalPrice || foodItem.price || 0);
                  const discPct = parseFloat(foodItem.discountPercent || foodItem.discount_percent || foodItem.offer_percentage || foodItem.discount || 0);
                  const discPriceProp = parseFloat(foodItem.discountPrice || foodItem.discount_price || foodItem.sellingPrice || 0);

                  let oldPrice = baseOriginalPrice;
                  let finalPrice = baseOriginalPrice;
                  let hasDiscount = false;
                  let calculatedPct = discPct;

                  if (discPriceProp > 0 && discPriceProp < baseOriginalPrice) {
                    hasDiscount = true;
                    finalPrice = discPriceProp;
                    if (!calculatedPct) {
                      calculatedPct = Math.round(((baseOriginalPrice - discPriceProp) / baseOriginalPrice) * 100);
                    }
                  } else if (discPct > 0 && discPct < 100) {
                    hasDiscount = true;
                    finalPrice = Math.round(baseOriginalPrice * (1 - discPct / 100));
                  }

                  const discountLabel = calculatedPct > 0 ? `${calculatedPct}% OFF` : `OFFER AVAILABLE`;

                  return hasDiscount ? (
                    <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
                      <span className="text-decoration-line-through text-danger opacity-75 fs-4">
                        ₹{oldPrice}
                      </span>
                      <span className="fw-extrabold text-dark fs-2 fw-bold">
                        ₹{finalPrice}
                      </span>
                      <span className="badge bg-danger text-white fw-bold rounded-pill px-3 py-1.5" style={{ fontSize: '11px' }}>
                        🔥 {discountLabel}
                      </span>
                    </div>
                  ) : (
                    <h3 className="fw-extrabold text-danger fw-bold fs-2 mb-3">₹{foodItem.price}</h3>
                  );
                })()}

                {/* Macro Nutritional Info - Only shown if available */}
                {(foodItem.calories || foodItem.protein) ? (
                  <div className="row g-2 mb-4">
                    {foodItem.calories ? (
                      <div className={foodItem.protein ? "col-6" : "col-12"}>
                        <div className="bg-light rounded-3 p-2.5 text-center border border-light-subtle">
                          <span className="text-secondary small d-block" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Calories</span>
                          <strong className="text-dark fs-6">{foodItem.calories} kcal</strong>
                        </div>
                      </div>
                    ) : null}
                    {foodItem.protein ? (
                      <div className={foodItem.calories ? "col-6" : "col-12"}>
                        <div className="bg-light rounded-3 p-2.5 text-center border border-light-subtle">
                          <span className="text-secondary small d-block" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Protein</span>
                          <strong className="text-dark fs-6">{foodItem.protein} g</strong>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Description */}
                <h6 className="fw-bold text-dark mb-1">Description</h6>
                <p className="text-muted mb-4" style={{ lineHeight: '1.6' }}>
                  {foodItem.description}
                </p>
              </div>

              <div>
                {/* Quantity selector */}
                {!isOutOfStock && (
                  <div className="d-flex align-items-center justify-content-between py-3 border-top border-light mb-4">
                    <span className="fw-bold text-secondary">
                      {isAdded ? 'Quantity in Cart' : 'Select Quantity'}
                    </span>
                    <QuantityControl
                      quantity={isAdded ? inCartQuantity : quantity}
                      min={isAdded ? 0 : 1}
                      max={foodItem.stock}
                      onChange={(newVal) => {
                        const maxS = typeof foodItem.stock === 'number' ? foodItem.stock : 20;
                        const clamped = Math.max(0, Math.min(newVal, maxS));
                        if (isAdded) {
                          if (clamped === 0) {
                            removeFromCart(foodItem.id);
                          } else {
                            updateQuantity(foodItem.id, clamped);
                          }
                        } else {
                          setQuantity(Math.max(1, clamped));
                        }
                      }}
                      onIncrease={() => {
                        const maxS = typeof foodItem.stock === 'number' ? foodItem.stock : 20;
                        if (isAdded) {
                          if (inCartQuantity < maxS) {
                            increaseQuantity(foodItem.id);
                          }
                        } else {
                          if (quantity < maxS) {
                            setQuantity(prev => prev + 1);
                          }
                        }
                      }}
                      onDecrease={() => {
                        if (isAdded) {
                          decreaseQuantity(foodItem.id);
                        } else {
                          setQuantity(prev => Math.max(1, prev - 1));
                        }
                      }}
                    />
                  </div>
                )}

                {/* Actions */}
                {isOutOfStock ? (
                  <div className="text-center">
                    <Button disabled variant="secondary" className="w-100 py-2.5 opacity-75 mb-1">
                      Out of Stock
                    </Button>
                    <span className="text-muted small fw-semibold" style={{ fontSize: '11px' }}>
                      Will be available soon
                    </span>
                  </div>
                ) : isAdded ? (
                  <Button onClick={() => navigate('/cart')} variant="primary" className="w-100 py-2.5 fw-bold">
                    Go to Cart ({inCartQuantity}) →
                  </Button>
                ) : (
                  <div className="row g-3">
                    <div className="col-6">
                      <Button onClick={handleAddToCart} variant="secondary" className="w-100 py-2.5">
                        Add to Cart
                      </Button>
                    </div>
                    <div className="col-6">
                      <Button onClick={handleBuyNow} variant="primary" className="w-100 py-2.5">
                        Buy Now
                      </Button>
                    </div>
                  </div>
                )}
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

export default FoodDetails;

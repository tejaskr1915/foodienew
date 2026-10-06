import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import { productService } from '../../services/productService';
import Loader from '../../components/common/Loader';
import QuantityControl from '../../components/customer/QuantityControl';
import Button from '../../components/common/Button';
import formatCurrency from '../../utils/formatCurrency';
import { useCart } from '../../hooks/useCart';
import BackButton from '../../components/common/BackButton';
import { getProductSellingPrice } from '../../utils/pricing';
import { getImageUrl } from '../../utils/imageUtils';

export const FoodDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    cartItems, 
    addToCart, 
    removeFromCart, 
    increaseQuantity, 
    decreaseQuantity, 
    updateQuantity, 
    showOutOfStockModal 
  } = useCart();

  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const existingInCart = cartItems.find((item) => Number(item.id) === Number(dish?.id));
  const inCartQuantity = existingInCart ? existingInCart.quantity : 0;
  const isAdded = inCartQuantity > 0;

  useEffect(() => {
    const fetchDish = async (showLoader = true) => {
      if (showLoader) setLoading(true);
      try {
        const data = await productService.getProductById(id);
        setDish(data);
      } catch (e) {
        console.error(e);
      }
      if (showLoader) setLoading(false);
    };
    fetchDish(true);

    const handleSync = () => {
      fetchDish(false);
    };

    window.addEventListener('foodie_products_updated', handleSync);
    window.addEventListener('foodie_inventory_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('foodie_products_updated', handleSync);
      window.removeEventListener('foodie_inventory_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [id]);

  useEffect(() => {
    if (dish) {
      const match = cartItems.find((item) => Number(item.id) === Number(dish.id));
      if (match && match.quantity > 0) {
        setQuantity(match.quantity);
      }
    }
  }, [dish, cartItems]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="min-vh-100 d-flex align-items-center justify-content-center animate-pulse">
          <Loader />
        </div>
      </CustomerLayout>
    );
  }

  const isOutOfStock = dish ? (dish.stock <= 0 || dish.status === 'Out of Stock' || dish.status === 'OUT_OF_STOCK' || dish.is_available === false) : false;

  if (!dish || isOutOfStock) {
    return (
      <CustomerLayout>
        <div className="container py-5 text-center px-3">
          <h5 className="fw-bold mb-2">Dish Unavailable</h5>
          <p className="text-secondary small mb-3">This dish is currently out of stock and not available on the menu.</p>
          <Button onClick={() => navigate('/customer/home')} variant="primary" className="mt-2">
            Back to Menu
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const handleAddToCart = async () => {
    const maxS = typeof dish.stock === 'number' ? dish.stock : 20;
    if (isOutOfStock || maxS <= 0) {
      if (showOutOfStockModal) {
        showOutOfStockModal({
          item: dish,
          stock: 0,
          message: `Sorry, "${dish.name}" is completely out of stock and cannot be added right now.`
        });
      }
      return;
    }
    const qtyToAdd = quantity > 0 ? quantity : 1;
    if (inCartQuantity + qtyToAdd > maxS) {
      if (showOutOfStockModal) {
        showOutOfStockModal({
          item: dish,
          stock: maxS,
          message: `You have reached the maximum available quantity (${maxS} in stock) for "${dish.name}". Additional quantity is out of stock.`
        });
      }
      if (inCartQuantity >= maxS) return;
      const remainingToAdd = maxS - inCartQuantity;
      await addToCart(dish, remainingToAdd);
      return;
    }
    await addToCart(dish, qtyToAdd);
  };

  const handleIncrease = async () => {
    const maxS = typeof dish.stock === 'number' ? dish.stock : 20;
    if (inCartQuantity > 0) {
      if (inCartQuantity < maxS) {
        await increaseQuantity(dish.id);
      } else if (showOutOfStockModal) {
        showOutOfStockModal({
          item: dish,
          stock: maxS,
          message: `You have reached the maximum available quantity (${maxS} in stock) for "${dish.name}". Additional quantity is out of stock.`
        });
      }
    } else {
      if (quantity < maxS) {
        setQuantity(prev => prev + 1);
      } else if (showOutOfStockModal) {
        showOutOfStockModal({
          item: dish,
          stock: maxS,
          message: `You have reached the maximum available quantity (${maxS} in stock) for "${dish.name}". Additional quantity is out of stock.`
        });
      }
    }
  };

  const handleDecrease = async () => {
    if (inCartQuantity > 0) {
      await decreaseQuantity(dish.id);
    } else {
      setQuantity(prev => Math.max(1, prev - 1));
    }
  };

  const handleChangeQuantity = async (newVal) => {
    const maxS = typeof dish.stock === 'number' ? dish.stock : 20;
    const clamped = Math.max(0, Math.min(newVal, maxS));
    if (inCartQuantity > 0) {
      if (clamped === 0) {
        await removeFromCart(dish.id);
      } else {
        await updateQuantity(dish.id, clamped);
      }
    } else {
      setQuantity(Math.max(1, clamped));
    }
    if (newVal > maxS && showOutOfStockModal) {
      showOutOfStockModal({
        item: dish,
        stock: maxS,
        message: `You have reached the maximum available quantity (${maxS} in stock) for "${dish.name}". Additional quantity is out of stock.`
      });
    }
  };

  const handleOutOfStockClick = () => {
    if (showOutOfStockModal) {
      showOutOfStockModal({
        item: dish,
        stock: 0,
        message: `Sorry, "${dish.name}" is currently out of stock and will be freshly prepared soon.`
      });
    }
  };

  const currentDisplayQuantity = inCartQuantity > 0 ? inCartQuantity : quantity;

  return (
    <CustomerLayout>
      {/* Back Button on the Page */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <BackButton />
        <span className="text-secondary small fw-semibold">Back to Menu</span>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
        <div className="row g-0">
          {/* Left / Top Column: Food Image */}
          <div className="col-12 col-md-6 position-relative" style={{ minHeight: '350px' }}>
            <img
              src={getImageUrl(dish.image)}
              alt={dish.name}
              className="w-100 h-100"
              style={{
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
                filter: isOutOfStock ? 'grayscale(100%) opacity(0.8)' : 'none'
              }}
              onError={(event) => {
                console.error('Failed to load food image:', event.currentTarget.src);
                event.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
              }}
            />
            {/* Veg/Non-veg overlay badge (top-right) */}
            <div
              className="position-absolute top-0 end-0 m-3 bg-white p-1.5 rounded-3 shadow-sm d-flex align-items-center justify-content-center"
              style={{ zIndex: 10 }}
            >
              <span className={(dish.foodType || dish.type || (dish.is_veg === false || dish.is_veg === 'false' ? 'non-veg' : 'veg')) === 'veg' ? 'veg-badge' : (dish.foodType || dish.type) === 'vegan' ? 'vegan-badge' : 'non-veg-badge'}></span>
            </div>

            {isOutOfStock && (
              <div className="position-absolute top-50 start-50 translate-middle text-center w-100 px-3" style={{ zIndex: 11 }}>
                <span className="badge bg-dark text-white fw-bold px-4 py-2 shadow-lg rounded-pill border border-secondary d-inline-block mb-1" style={{ fontSize: '13px', letterSpacing: '0.5px' }}>
                  OUT OF STOCK
                </span>
                <span className="badge bg-danger text-white fw-bold px-3 py-1.5 rounded-pill shadow d-inline-block" style={{ fontSize: '11px' }}>
                  Currently Unavailable
                </span>
              </div>
            )}
          </div>

          {/* Right / Bottom Column: Details */}
          <div className="col-12 col-md-6 p-4 p-md-5 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1.5 rounded-pill">
                    {dish.category}
                  </span>
                  
                  {/* Veg / Non-Veg / Vegan Badge */}
                  {(() => {
                    const resolvedType = (dish.foodType || dish.type || (dish.is_veg === false || dish.is_veg === 'false' ? 'non-veg' : 'veg')).toLowerCase();
                    const isVeg = resolvedType === 'veg';
                    const isVegan = resolvedType === 'vegan';
                    return (
                      <div className="d-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill border bg-white shadow-xs">
                        <span className={isVeg ? 'veg-badge' : isVegan ? 'vegan-badge' : 'non-veg-badge'} style={{ width: '13px', height: '13px' }}></span>
                        <span className="fw-bold" style={{ fontSize: '11px', color: isVeg ? '#16a34a' : isVegan ? '#059669' : '#dc2626' }}>
                          {isVeg ? 'Veg' : isVegan ? 'Vegan' : 'Non-Veg'}
                        </span>
                      </div>
                    );
                  })()}

                  {(() => {
                    let catDesc = '';
                    try {
                      const descMap = JSON.parse(localStorage.getItem('foodie_category_descriptions') || '{}');
                      catDesc = descMap[dish.category] || '';
                    } catch (e) {
                      catDesc = '';
                    }
                    return catDesc ? (
                      <span className="text-secondary small fst-italic" style={{ fontSize: '12px' }}>
                        — {catDesc}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              <h2 className="fw-extrabold text-dark mb-2">{dish.name}</h2>

              {(() => {
                const numericDiscount = parseFloat(dish.discountPercent || dish.discount_percent || dish.offer_percentage || dish.discount || 0);
                const originalPrice = parseFloat(dish.originalPrice || dish.price || 0);
                const sellingPrice = getProductSellingPrice(dish) || parseFloat(dish.sellingPrice || dish.price || 0);
                const hasDiscount = Boolean(
                  dish.hasDiscount ||
                  (numericDiscount > 0 && numericDiscount < 100) ||
                  (sellingPrice > 0 && originalPrice > sellingPrice)
                );
                const discountPct = numericDiscount > 0
                  ? numericDiscount
                  : (originalPrice > sellingPrice ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : 0);
                const discountLabel = `${discountPct}% OFF`;

                return hasDiscount ? (
                  <div className="d-flex align-items-baseline gap-2 mb-4">
                    <span className="text-decoration-line-through text-muted fs-5">
                      {formatCurrency(originalPrice)}
                    </span>
                    <span className="fw-extrabold text-dark fs-2">
                      {formatCurrency(sellingPrice)}
                    </span>
                    <span className="badge bg-danger text-white fw-bold rounded-pill px-3 py-1.5" style={{ fontSize: '11px' }}>
                      🔥 {discountLabel}
                    </span>
                  </div>
                ) : (
                  <h3 className="fw-bold text-dark mb-4">{formatCurrency(dish.price)}</h3>
                );
              })()}

              {/* Calories and Protein Section - Only shown if explicitly provided */}
              {(dish.calories || dish.protein) ? (
                <div className="row g-2 mb-4">
                  {dish.calories ? (
                    <div className={dish.protein ? "col-6" : "col-12"}>
                      <div className="bg-light rounded-3 p-2.5 text-center border border-light-subtle">
                        <span className="text-secondary small d-block" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Calories</span>
                        <strong className="text-dark fs-6">{dish.calories} kcal</strong>
                      </div>
                    </div>
                  ) : null}
                  {dish.protein ? (
                    <div className={dish.calories ? "col-6" : "col-12"}>
                      <div className="bg-light rounded-3 p-2.5 text-center border border-light-subtle">
                        <span className="text-secondary small d-block" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Protein</span>
                        <strong className="text-dark fs-6">{dish.protein} g</strong>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <h6 className="fw-bold text-dark mb-2">Description</h6>
              <p className="text-secondary small mb-4" style={{ lineHeight: '1.6' }}>
                {dish.description}
              </p>
            </div>

            <div>
              {/* Quantity selector */}
              {!isOutOfStock && (
                <div className="d-flex align-items-center justify-content-between py-3 border-top border-bottom border-light mb-4">
                  <span className="fw-bold text-secondary">
                    {isAdded ? 'Quantity in Cart' : 'Select Quantity'}
                  </span>
                  <QuantityControl
                    quantity={currentDisplayQuantity}
                    min={isAdded ? 0 : 1}
                    max={dish.stock}
                    onChange={handleChangeQuantity}
                    onIncrease={handleIncrease}
                    onDecrease={handleDecrease}
                  />
                </div>
              )}

              <div className="d-grid gap-2">
                {isOutOfStock ? (
                  <div className="text-center">
                    <Button
                      onClick={handleOutOfStockClick}
                      variant="secondary"
                      className="w-100 py-2.5 opacity-75 mb-1"
                      style={{ cursor: 'pointer' }}
                      title="Click to view out of stock details"
                    >
                      Out of Stock
                    </Button>
                    <span className="text-muted small fw-semibold" style={{ fontSize: '11px' }}>
                      Will be available soon
                    </span>
                  </div>
                ) : isAdded ? (
                  <Button
                    onClick={() => navigate('/customer/cart')}
                    variant="primary"
                    className="py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  >
                    Go to Cart ({inCartQuantity}) →
                  </Button>
                ) : (
                  <Button onClick={handleAddToCart} variant="primary" className="py-2.5 fw-bold shadow-sm">
                    Add to Cart — {formatCurrency(getProductSellingPrice(dish) * (quantity > 0 ? quantity : 1))}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default FoodDetails;

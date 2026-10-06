import { calculateDiscountPrice } from './discount.js';

export const GST_RATE = 0.05; // 5% GST configured for restaurant orders
export const SERVICE_CHARGE_RATE = 0.02; // 2% Service Charge
export const DEFAULT_PACKING_CHARGE_PER_ITEM = 15; // 15 rupees per food item for takeaway
export const DEFAULT_PACKING_CHARGE = 15;

/**
 * Resolves the final selling price of a product, accounting for discounts.
 * @param {Object} product - The product item object
 * @returns {number} The final selling price
 */
export const getProductSellingPrice = (product) => {
  if (!product) return 0;
  if (product.discountPrice !== undefined && product.discountPrice > 0) {
    return product.discountPrice;
  }
  return calculateDiscountPrice(product.price, product.discountPercent);
};

/**
 * Calculates discount from a coupon given the subtotal before GST.
 * @param {Object} coupon - The coupon object
 * @param {number} subtotalBeforeGst - The order subtotal before GST (including add-ons)
 * @returns {number} The calculated discount amount (capped at subtotal)
 */
export const calculateCouponDiscount = (coupon, subtotalBeforeGst) => {
  if (!coupon || !subtotalBeforeGst || subtotalBeforeGst <= 0) return 0;

  const minOrder = Number(coupon.minOrderValue || coupon.minimum_order_amount || coupon.min_order_amount || 0);
  if (subtotalBeforeGst < minOrder) return 0;

  const discountVal = Number(coupon.discount || coupon.discount_value || coupon.discount_amount || 0);
  const type = String(coupon.type || coupon.discount_type || '').toLowerCase();

  let discount = 0;
  if (type === 'percentage') {
    discount = (subtotalBeforeGst * discountVal) / 100;
    const maxDiscount = Number(coupon.maxDiscount || coupon.maximum_discount || 0);
    if (maxDiscount > 0 && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else {
    // Fixed / Flat
    discount = discountVal;
  }

  // Ensure discount does not exceed subtotal
  return Math.min(Math.max(0, Math.round(discount)), subtotalBeforeGst);
};

/**
 * Calculates complete authoritative bill breakdown strictly following:
 * ITEMS TOTAL
 *   ↓
 * Applicable discount/coupon
 *   ↓
 * Takeaway charges, if applicable (-> TAXABLE AMOUNT)
 *   ↓
 * GST calculation (5% on Taxable Amount)
 *   ↓
 * Service charge (2% on Food subtotal after coupon, if not removed)
 *   ↓
 * Delivery/other applicable charges
 *   ↓
 * FINAL TOTAL
 */
export const calculateBillDetails = ({
  items = [],
  coupon = null,
  isTakeaway = false,
  packingCharge = undefined,
  packingChargePerItem = DEFAULT_PACKING_CHARGE_PER_ITEM,
  gstRate = GST_RATE,
  serviceChargeRate = SERVICE_CHARGE_RATE,
  isServiceChargeRemoved = false,
  deliveryFee = 0
}) => {
  let itemsSubtotal = 0;
  let menuDiscounts = 0;
  let extraCharges = 0;
  let totalItemQty = 0;

  (items || []).forEach(item => {
    const qty = Number(item.quantity || 1);
    totalItemQty += qty;
    const originalPrice = Number(item.price || 0);
    const sellingPrice = getProductSellingPrice(item);

    itemsSubtotal += originalPrice * qty;
    if (originalPrice > sellingPrice) {
      menuDiscounts += (originalPrice - sellingPrice) * qty;
    }

    if (Array.isArray(item.extraIngredients)) {
      const extrasPerItem = item.extraIngredients.reduce((s, e) => s + Number(e.price || 0), 0);
      extraCharges += extrasPerItem * qty;
    }
  });

  const ratePerItem = Number(packingChargePerItem !== undefined ? packingChargePerItem : DEFAULT_PACKING_CHARGE_PER_ITEM);
  const calculatedPacking = totalItemQty * ratePerItem;
  const appliedPackingCharge = isTakeaway ? (packingCharge !== undefined ? Number(packingCharge) : calculatedPacking) : 0;

  // Net food subtotal before coupon and before GST
  const netFoodSubtotal = Math.max(0, itemsSubtotal - menuDiscounts);
  const subtotalBeforeGst = netFoodSubtotal + extraCharges;

  // Evaluate coupon eligibility based on subtotalBeforeGst
  let discountAmount = 0;
  let isCouponEligible = false;
  let couponRemaining = 0;

  if (coupon) {
    const minOrder = Number(coupon.minOrderValue || coupon.minimum_order_amount || coupon.min_order_amount || 0);
    if (subtotalBeforeGst >= minOrder) {
      isCouponEligible = true;
      discountAmount = calculateCouponDiscount(coupon, subtotalBeforeGst);
    } else {
      couponRemaining = Math.max(0, minOrder - subtotalBeforeGst);
    }
  }

  const foodAfterDiscount = Math.max(0, subtotalBeforeGst - discountAmount);

  // GST Taxable Amount = (Items Subtotal after coupon) + Takeaway Packing Charges
  const taxableAmount = foodAfterDiscount + appliedPackingCharge;

  // Custom rounding function for GST and other charges
  const customRound = (value) => {
    const decimal = value - Math.floor(value);
    if (decimal >= 0.50) {
      return Math.ceil(value);
    } else {
      return Math.floor(value);
    }
  };

  // GST calculated at 5% on taxable amount
  const taxAmount = customRound(taxableAmount * gstRate);

  // Service Charge (2% on food after discount, unless removed by customer)
  const calculatedServiceCharge = isServiceChargeRemoved ? 0 : customRound(foodAfterDiscount * serviceChargeRate);

  // Grand Total = Taxable amount + GST + Service Charge + Delivery Fee
  const grandTotal = taxableAmount + taxAmount + calculatedServiceCharge + Number(deliveryFee || 0);

  return {
    itemsSubtotal,
    menuDiscounts,
    extraCharges,
    packingCharge: appliedPackingCharge,
    isTakeaway: !!isTakeaway,
    netFoodSubtotal,
    subtotal: subtotalBeforeGst,
    discount: discountAmount,
    taxableAmount,
    tax: taxAmount,
    serviceCharge: calculatedServiceCharge,
    isServiceChargeRemoved: !!isServiceChargeRemoved,
    deliveryFee: Number(deliveryFee || 0),
    grandTotal,
    isCouponEligible,
    couponRemaining
  };
};

export default getProductSellingPrice;




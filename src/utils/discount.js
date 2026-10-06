/**
 * Utility to calculate discounted price based on base price and discount percentage.
 * @param {number} originalPrice - Base price of the item
 * @param {number} discountPercent - Discount percentage (e.g. 50)
 * @returns {number} The calculated and rounded final selling price
 */
export const calculateDiscountPrice = (originalPrice, discountPercent) => {
  if (!discountPercent || discountPercent <= 0) return originalPrice;
  const clampedPct = Math.min(100, Math.max(0, Number(discountPercent)));
  const discountAmount = (originalPrice * clampedPct) / 100;
  return Math.max(0, Math.round(originalPrice - discountAmount));
};

export default calculateDiscountPrice;

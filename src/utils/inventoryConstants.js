/**
 * Inventory Condition Constants
 */
export const MINIMUM_STOCK_COUNT = 5; // Low Stock threshold
export const MIN_STOCK_LIMIT = 0;      // Out of Stock limit
export const MAX_STOCK_LIMIT = 100;    // Upper capacity limit

export const getStockStatus = (count) => {
  const num = parseInt(count, 10);
  if (isNaN(num) || num <= MIN_STOCK_LIMIT) return 'OUT_OF_STOCK';
  if (num <= MINIMUM_STOCK_COUNT) return 'LOW_STOCK';
  return 'IN_STOCK';
};

export default {
  MINIMUM_STOCK_COUNT,
  MIN_STOCK_LIMIT,
  MAX_STOCK_LIMIT,
  getStockStatus
};

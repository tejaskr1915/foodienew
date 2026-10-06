/**
 * Calculates stock status dynamically from the saved stock count and minimum stock
 * @param {number} stock 
 * @param {number} minStock 
 * @returns {string} 'In Stock' | 'Out of Stock' | 'Low Stock'
 */
export const getStockStatus = (stock, minStock) => {
  const s = parseInt(stock);
  const m = parseInt(minStock);
  
  if (isNaN(s) || s <= 0) {
    return 'Out of Stock';
  }
  if (!isNaN(m) && s <= m) {
    return 'Low Stock';
  }
  return 'In Stock';
};

export default getStockStatus;

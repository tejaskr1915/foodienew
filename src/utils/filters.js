import { getProductSellingPrice } from './pricing';
import { normalizeCategoryName } from './categoryUtils';

export const normalizeFoodType = (type) => {
  if (!type) return 'veg';
  const clean = String(type).trim().toLowerCase().replace(/[\s_-]/g, '');
  if (clean === 'nonveg' || clean === 'nonvegetarian') return 'non-veg';
  if (clean === 'vegan') return 'vegan';
  return 'veg';
};


// Helper to identify if product has a discount
export const isDiscountProduct = (item) => {
  if (!item) return false;
  const baseOriginalPrice = parseFloat(item.originalPrice || item.price || 0);
  const discPct = parseFloat(item.discountPercent || item.discount_percent || item.offer_percentage || item.discount || 0);
  const discPriceProp = parseFloat(item.discountPrice || item.discount_price || 0);

  return Boolean(
    item.hasDiscount ||
    (discPct > 0 && discPct < 100) ||
    (discPriceProp > 0 && discPriceProp < baseOriginalPrice)
  );
};

// Helper to identify if product is in the admin dashboard's top selling list or marked popular
export const isPopularProduct = (item) => {
  if (!item) return false;
  if (item.isTopSelling !== undefined) {
    return Boolean(item.isTopSelling);
  }
  let topIds = [];
  try {
    topIds = JSON.parse(localStorage.getItem('foodie_top_selling_ids') || '[]');
  } catch (e) {}

  if (topIds.length > 0) {
    return topIds.includes(Number(item.id));
  }

  try {
    const counts = JSON.parse(localStorage.getItem('foodie_top_selling_dish_counts') || '{}');
    const keysWithOrders = Object.keys(counts).filter(id => (counts[id] || 0) > 0);
    if (keysWithOrders.length > 0) {
      const sortedIds = keysWithOrders
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 5)
        .map(id => parseInt(id));
      return sortedIds.includes(Number(item.id));
    }
  } catch (e) {}

  return Boolean(item.popular || item.isPopular);
};

export const filterAndSortProducts = (products, options = {}) => {
  if (!Array.isArray(products)) return [];

  const {
    category = 'All',
    categories = [],
    selectedCategories = [],
    search = '',
    sortBy = 'DEFAULT',
    selectedFoodTypes = []
  } = options;

  // Trim search term and convert to lowercase
  const searchTerm = (search || '').trim().toLowerCase();

  // Consolidate active categories list
  const activeCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : (Array.isArray(selectedCategories) && selectedCategories.length > 0
      ? selectedCategories
      : [category]);

  const isCategoryMatch = (p, cat) => {
    if (!cat || cat === 'All') return true;
    if (cat === 'Popular') return isPopularProduct(p);
    if (cat === 'Discount' || cat === 'Discounts' || cat === 'Offers') return isDiscountProduct(p);
    return normalizeCategoryName(p.category) === normalizeCategoryName(cat);
  };

  // 1. Filter by Search, Category, and Food Type
  let result = products.filter((p) => {
    if (!p) return false;

    // Search against item name, description, and category safely
    const nameStr = String(p.name || '').toLowerCase();
    const descStr = String(p.description || '').toLowerCase();
    const catStr = String(p.category || '').toLowerCase();

    const matchesSearch =
      !searchTerm ||
      nameStr.includes(searchTerm) ||
      descStr.includes(searchTerm) ||
      catStr.includes(searchTerm);

    // Category Filter (OR logic across selected categories)
    const matchesCategory =
      activeCategories.length === 0 ||
      activeCategories.includes('All') ||
      activeCategories.some((cat) => isCategoryMatch(p, cat));

    // Food Type Filter (Veg / Non-Veg / Vegan)
    const rawType = p.foodType ?? p.type ?? p.food_type ?? (p.is_veg === false || p.is_veg === 'false' ? 'non-veg' : 'veg');
    const productFoodType = normalizeFoodType(rawType);
    const matchesFoodType =
      !selectedFoodTypes ||
      selectedFoodTypes.length === 0 ||
      selectedFoodTypes.some((ft) => normalizeFoodType(ft) === productFoodType);

    return matchesSearch && matchesCategory && matchesFoodType;
  });

  // 2. Apply sorting/filtering dropdown logic
  switch (sortBy) {
    case 'HIGHEST_DISCOUNT':
      result = [...result].sort((a, b) => {
        const getDiscValue = (item) => {
          const orig = parseFloat(item.originalPrice || item.price || 0);
          const sell = getProductSellingPrice(item);
          const discAmt = Math.max(0, orig - sell);
          const discPct = orig > 0 ? (discAmt / orig) * 100 : parseFloat(item.discountPercent || item.discount_percent || item.offer_percentage || 0);
          return discPct || discAmt;
        };
        return getDiscValue(b) - getDiscValue(a);
      });
      break;
    case 'PRICE_LOW_HIGH':
      result = [...result].sort((a, b) => getProductSellingPrice(a) - getProductSellingPrice(b));
      break;
    case 'PRICE_HIGH_LOW':
      result = [...result].sort((a, b) => getProductSellingPrice(b) - getProductSellingPrice(a));
      break;
    case 'DISCOUNT_50':
      result = result.filter((p) => Number(p.discountPercent) >= 50 || Number(p.discount) >= 50);
      break;
    case 'DISCOUNT_ANY':
      result = result.filter(
        (p) =>
          Boolean(p.hasDiscount) ||
          (p.discountPercent && Number(p.discountPercent) > 0) ||
          (p.discount && Number(p.discount) > 0) ||
          (p.discountPrice && Number(p.discountPrice) > 0)
      );
      break;
    case 'BOGO':
      result = result.filter(
        (p) =>
          Boolean(p.isBogo || p.is_bogo) ||
          (p.tags && String(p.tags).toLowerCase().includes('bogo')) ||
          (p.name && String(p.name).toLowerCase().includes('bogo'))
      );
      break;
    case 'COMBO':
      result = result.filter(
        (p) =>
          Boolean(p.isCombo || p.is_combo) ||
          (p.category && String(p.category).toLowerCase().includes('combo')) ||
          (p.name && String(p.name).toLowerCase().includes('combo'))
      );
      break;
    case 'POPULAR':
      result = result.filter((p) => Boolean(p.popular || p.isPopular));
      break;
    case 'NEWEST':
      result = result.filter((p) => Boolean(p.isNew || p.is_new));
      break;
    case 'DEFAULT':
    default:
      if (activeCategories.includes('Popular')) {
        result = [...result].sort((a, b) => {
          const aCount = Number(a.orderCount || 0);
          const bCount = Number(b.orderCount || 0);
          return bCount - aCount;
        });
      }
      break;
  }

  // Helper to identify if product is out of stock
  const isOutOfStock = (p) => {
    if (!p) return false;
    return (
      (p.stock !== undefined && Number(p.stock) <= 0) ||
      p.status === 'Out of Stock' ||
      p.status === 'OUT_OF_STOCK' ||
      p.is_available === false
    );
  };

  // Customers should not be able to see out of stock items anywhere
  return result.filter((p) => !isOutOfStock(p));
};

export default filterAndSortProducts;

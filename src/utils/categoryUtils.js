/**
 * Normalizes a category name for safe comparisons.
 * Strips whitespace, converts to lowercase, normalizes spaces/hyphens/underscores,
 * and handles basic plural singularization.
 */
export const normalizeCategoryName = (name) => {
  if (!name) return "";
  let clean = String(name)
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, ' ')
    .trim();
  if (clean.endsWith('s') && clean.length > 3) {
    clean = clean.slice(0, -1);
  }
  return clean;
};

/**
 * Maps backend category names to frontend displayed names.
 */
export const getFrontendCategoryName = (beName) => {
  if (!beName) return 'Main Course';
  const str = String(beName).trim();
  if (!str) return 'Main Course';
  return str.split(' ').map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1)) : '').join(' ');
};

/**
 * Maps frontend display category names back to preferred backend names.
 */
export const getBackendCategoryName = (feName) => {
  if (!feName) return 'Main Course';
  return feName;
};

/**
 * Checks if a dish belongs to a category (by ID, category name, or foodType for Veg/Non-Veg/Vegan categories).
 */
export const isDishInCategory = (dish, cat) => {
  if (!dish || !cat) return false;
  const catName = typeof cat === 'string' ? cat : (cat.name || cat.originalName || '');
  const catNorm = normalizeCategoryName(catName);
  const catId = typeof cat === 'object' ? cat.id : null;

  // 1. Direct ID match
  if (catId && (Number(dish.categoryId) === Number(catId) || Number(dish.category) === Number(catId))) {
    return true;
  }

  // 2. Direct category name match
  const dNorm = normalizeCategoryName(dish.category);
  const dFeNorm = normalizeCategoryName(getFrontendCategoryName(dish.category));
  const catOrigNorm = typeof cat === 'object' && cat.originalName ? normalizeCategoryName(cat.originalName) : catNorm;

  if (dNorm === catNorm || dFeNorm === catNorm || dNorm === catOrigNorm || dFeNorm === catOrigNorm) {
    return true;
  }

  // 3. Match vegan, veg, non-veg food types to category
  const dishType = (dish.foodType || dish.type || '').toLowerCase().replace(/[\s-_]/g, '');
  const catClean = catNorm.replace(/[\s-_]/g, '');

  if (catClean === 'vegan' && dishType === 'vegan') return true;
  if ((catClean === 'veg' || catClean === 'vegetarian') && (dishType === 'veg' || dishType === 'vegetarian')) return true;
  if ((catClean === 'nonveg' || catClean === 'nonvegetarian') && (dishType === 'nonveg' || dishType === 'nonvegetarian')) return true;

  return false;
};

export default {
  normalizeCategoryName,
  getFrontendCategoryName,
  getBackendCategoryName,
  isDishInCategory
};

import api from './api';
import { normalizeCategoryName, getFrontendCategoryName } from '../utils/categoryUtils';
import { productService, getCachedCategories, clearStaticProductCache } from './productService';

const getDeletedCategoriesList = () => {
  try {
    return JSON.parse(localStorage.getItem('foodie_deleted_categories') || '[]');
  } catch (e) {
    return [];
  }
};

const isCategoryDeleted = (id, name, originalName, deletedList) => {
  if (!deletedList || deletedList.length === 0) return false;
  const strId = String(id !== undefined && id !== null ? id : '');
  const normName = normalizeCategoryName(name || '');
  const normOrig = normalizeCategoryName(originalName || '');
  const normFe = normalizeCategoryName(getFrontendCategoryName(name || ''));

  return deletedList.some(item => {
    const itemStr = String(item);
    const itemNorm = normalizeCategoryName(itemStr);
    return itemStr === strId ||
      itemNorm === normName ||
      itemNorm === normOrig ||
      itemNorm === normFe;
  });
};

export const menuService = {
  getMenus: async () => {
    let rawCategories = [];
    try {
      rawCategories = await getCachedCategories();
    } catch (e) {
      console.warn("Could not fetch remote categories, using local cache:", e);
      rawCategories = [];
    }

    let savedCustom = [];
    try {
      savedCustom = JSON.parse(localStorage.getItem('foodie_custom_categories') || '[]');
    } catch (e) {}

    let savedDesc = {};
    try {
      savedDesc = JSON.parse(localStorage.getItem('foodie_category_descriptions') || '{}');
    } catch (e) {}

    const deletedList = getDeletedCategoriesList();

    const allCatMap = new Map();

    // 1. Add remote categories from backend DB (if not marked deleted)
    (rawCategories || []).forEach(c => {
      const id = c.id || c.category_id;
      const feName = getFrontendCategoryName(c.name);
      const normKey = normalizeCategoryName(feName);

      if (isCategoryDeleted(id, c.name, c.name, deletedList)) {
        return;
      }

      const desc = c.description || savedDesc[id] || savedDesc[String(id)] || savedDesc[normKey] || savedDesc[normalizeCategoryName(c.name)] || '';
      allCatMap.set(normKey, {
        id: id,
        name: feName,
        originalName: c.name,
        description: desc,
        status: c.is_active !== false ? 'Active' : 'Inactive',
        dishCount: 0,
        restaurant: c.restaurant || 1
      });
    });

    // 2. Merge local custom categories (if not marked deleted)
    (savedCustom || []).forEach(c => {
      const id = c.id || c.category_id;
      const feName = getFrontendCategoryName(c.name);
      const normKey = normalizeCategoryName(feName);

      if (isCategoryDeleted(id, c.name, c.originalName, deletedList)) {
        return;
      }

      const desc = c.description || savedDesc[id] || savedDesc[String(id)] || savedDesc[normKey] || '';
      if (!allCatMap.has(normKey)) {
        allCatMap.set(normKey, {
          id: id,
          name: feName,
          originalName: c.name,
          description: desc,
          status: c.status || (c.is_active !== false ? 'Active' : 'Inactive'),
          dishCount: 0,
          restaurant: c.restaurant || 1
        });
      } else {
        const existing = allCatMap.get(normKey);
        if (!existing.description && desc) {
          existing.description = desc;
        }
      }
    });

    return Array.from(allCatMap.values());
  },

  createMenu: async (data) => {
    const catName = (data.name || '').trim();
    const catDesc = data.description ? data.description.trim() : '';
    const isActive = data.status === 'Active' || data.is_active !== false;

    // Resolve active restaurant ID dynamically
    let restaurantId = 1;
    try {
      const restRes = await api.get('/restaurants/');
      const restList = restRes.data?.data || (Array.isArray(restRes.data) ? restRes.data : (restRes.data?.results || []));
      if (Array.isArray(restList) && restList.length > 0) {
        restaurantId = restList[0].id || restList[0].restaurant_id || 1;
      }
    } catch (e) { }

    let resData = null;
    let catId = `CAT_${Date.now()}`;
    let createdName = catName;
    let createdDesc = catDesc;

    try {
      const res = await api.post('/categories/', {
        name: catName,
        description: catDesc || "",
        is_active: isActive,
        restaurant: restaurantId
      });
      resData = res.data?.data || res.data;
      if (resData?.id || resData?.category_id) {
        catId = resData.id || resData.category_id;
        createdName = resData.name || catName;
        createdDesc = resData.description !== undefined ? resData.description : catDesc;
      }
    } catch (err) {
      console.warn("Backend /categories/ post warning, creating local custom category:", err);
      const errMsg = err.response?.data?.errors?.name?.[0] || err.response?.data?.message || err.message;
      if (errMsg && (errMsg.includes('unique') || errMsg.includes('already exists'))) {
        throw err;
      }
    }

    // Un-delete from deleted categories blacklist if recreating
    try {
      const deletedList = getDeletedCategoriesList();
      const filteredDeleted = deletedList.filter(item => {
        const itemNorm = normalizeCategoryName(String(item));
        return itemNorm !== normalizeCategoryName(createdName) &&
          itemNorm !== normalizeCategoryName(catName) &&
          itemNorm !== normalizeCategoryName(getFrontendCategoryName(createdName)) &&
          String(item) !== String(catId);
      });
      localStorage.setItem('foodie_deleted_categories', JSON.stringify(filteredDeleted));
    } catch (e) {}

    // Persist in local custom categories
    try {
      const savedCustom = JSON.parse(localStorage.getItem('foodie_custom_categories') || '[]');
      const existingIdx = savedCustom.findIndex(c => 
        normalizeCategoryName(c.name) === normalizeCategoryName(createdName) ||
        String(c.id) === String(catId)
      );
      const newCatObj = {
        id: catId,
        name: createdName,
        originalName: createdName,
        description: createdDesc,
        status: isActive ? 'Active' : 'Inactive',
        is_active: isActive,
        dishCount: 0,
        restaurant: 1
      };
      if (existingIdx >= 0) {
        savedCustom[existingIdx] = newCatObj;
      } else {
        savedCustom.push(newCatObj);
      }
      localStorage.setItem('foodie_custom_categories', JSON.stringify(savedCustom));
    } catch (e) {
      console.error("Error saving custom category in local storage:", e);
    }

    // Persist category description
    if (createdDesc !== undefined) {
      try {
        const savedDesc = JSON.parse(localStorage.getItem('foodie_category_descriptions') || '{}');
        savedDesc[catId] = createdDesc;
        savedDesc[String(catId)] = createdDesc;
        savedDesc[normalizeCategoryName(createdName)] = createdDesc;
        savedDesc[normalizeCategoryName(getFrontendCategoryName(createdName))] = createdDesc;
        localStorage.setItem('foodie_category_descriptions', JSON.stringify(savedDesc));
      } catch (e) {}
    }

    clearStaticProductCache();

    try {
      window.dispatchEvent(new CustomEvent('foodie_categories_updated', { detail: { id: catId, name: createdName, description: createdDesc } }));
      window.dispatchEvent(new CustomEvent('foodie_products_updated'));
      localStorage.setItem('foodie_inventory_sync_trigger', Date.now().toString());
    } catch (e) {}

    return {
      id: catId,
      name: getFrontendCategoryName(createdName),
      originalName: createdName,
      description: createdDesc,
      status: isActive ? 'Active' : 'Inactive',
      dishCount: 0,
      restaurant: 1
    };
  },

  updateMenu: async (id, data) => {
    const numericId = Number(id);
    if (isNaN(numericId) || !id || String(id) === 'all') {
      console.warn("Skipping invalid category update ID:", id);
      return { id, name: data.name, description: data.description || '', status: data.status, dishCount: 0 };
    }

    let restaurantId = 1;
    try {
      const restRes = await api.get('/restaurants/');
      const restList = restRes.data?.data || (Array.isArray(restRes.data) ? restRes.data : (restRes.data?.results || []));
      if (Array.isArray(restList) && restList.length > 0) {
        restaurantId = restList[0].id || restList[0].restaurant_id || 1;
      }
    } catch (e) { }

    const payload = {
      name: data.name,
      description: data.description || '',
      is_active: data.status === 'Active' || data.is_active === true,
      restaurant: restaurantId
    };

    if (data.description !== undefined) {
      try {
        const savedDesc = JSON.parse(localStorage.getItem('foodie_category_descriptions') || '{}');
        savedDesc[id] = data.description;
        savedDesc[String(id)] = data.description;
        savedDesc[normalizeCategoryName(data.name)] = data.description;
        savedDesc[normalizeCategoryName(getFrontendCategoryName(data.name))] = data.description;
        localStorage.setItem('foodie_category_descriptions', JSON.stringify(savedDesc));
      } catch (e) {}
    }

    try {
      const res = await api.put(`/categories/${numericId}/`, payload);
      clearStaticProductCache();
      const updatedData = res.data?.data || res.data;
      const catId = updatedData.id || updatedData.category_id;
      const updatedDesc = updatedData.description || data.description || '';
      return {
        id: catId,
        name: getFrontendCategoryName(updatedData.name),
        description: updatedDesc,
        status: updatedData.is_active ? 'Active' : 'Inactive',
        dishCount: 0,
        restaurant: updatedData.restaurant
      };
    } catch (e) {
      console.error(`Failed to update category ${id}:`, e);
      return { id, name: data.name, description: data.description || '', status: data.status, dishCount: 0 };
    }
  },

  deleteMenu: async (id, categoryName) => {
    const numericId = Number(id);
    const rawName = typeof categoryName === 'string' ? categoryName : (typeof id === 'string' && isNaN(numericId) ? id : '');
    const normName = normalizeCategoryName(rawName);
    const feNormName = normalizeCategoryName(getFrontendCategoryName(rawName));

    // 1. Try deleting on backend if it has a numeric ID
    if (!isNaN(numericId) && numericId > 0) {
      try {
        await api.delete(`/categories/${numericId}/`);
      } catch (e) {
        console.warn(`Backend category delete failed for ${numericId} (will persist deletion locally):`, e);
      }
    }

    // 2. Add to foodie_deleted_categories blacklist
    try {
      const deletedList = getDeletedCategoriesList();
      const newItems = [String(id)];
      if (numericId && !isNaN(numericId)) newItems.push(numericId);
      if (rawName) {
        newItems.push(rawName);
        newItems.push(normName);
        newItems.push(feNormName);
      }
      newItems.forEach(item => {
        if (item && !deletedList.includes(item)) {
          deletedList.push(item);
        }
      });
      localStorage.setItem('foodie_deleted_categories', JSON.stringify(deletedList));
    } catch (e) {
      console.error("Error saving deleted categories list:", e);
    }

    // 3. Remove from foodie_custom_categories
    try {
      const savedCustom = JSON.parse(localStorage.getItem('foodie_custom_categories') || '[]');
      const filteredCustom = savedCustom.filter(c => {
        const cIdStr = String(c.id || '');
        const cNorm = normalizeCategoryName(c.name || '');
        const cOrigNorm = normalizeCategoryName(c.originalName || '');
        const cFeNorm = normalizeCategoryName(getFrontendCategoryName(c.name || ''));

        const matchId = String(id) === cIdStr || (numericId && Number(c.id) === numericId);
        const matchName = normName && (cNorm === normName || cOrigNorm === normName || cFeNorm === normName || cNorm === feNormName || cOrigNorm === feNormName);
        return !(matchId || matchName);
      });
      localStorage.setItem('foodie_custom_categories', JSON.stringify(filteredCustom));
    } catch (e) {
      console.error("Error updating custom categories on delete:", e);
    }

    // 4. Remove from foodie_category_descriptions
    try {
      const savedDesc = JSON.parse(localStorage.getItem('foodie_category_descriptions') || '{}');
      delete savedDesc[id];
      delete savedDesc[String(id)];
      if (numericId && !isNaN(numericId)) delete savedDesc[numericId];
      if (rawName) {
        delete savedDesc[rawName];
        delete savedDesc[normName];
        delete savedDesc[feNormName];
      }
      localStorage.setItem('foodie_category_descriptions', JSON.stringify(savedDesc));
    } catch (e) {}

    clearStaticProductCache();

    try {
      window.dispatchEvent(new CustomEvent('foodie_categories_updated', { detail: { id, name: rawName } }));
      window.dispatchEvent(new CustomEvent('foodie_products_updated'));
      localStorage.setItem('foodie_inventory_sync_trigger', Date.now().toString());
    } catch (e) {}

    return true;
  }
};

export default menuService;

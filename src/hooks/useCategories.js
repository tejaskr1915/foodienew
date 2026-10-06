import { useState, useEffect, useCallback } from 'react';
import { menuService } from '../services/menuService';
import { productService } from '../services/productService';
import { getFrontendCategoryName, normalizeCategoryName } from '../utils/categoryUtils';
import { isDiscountProduct, isPopularProduct } from '../utils/filters';

/**
 * Custom hook to dynamically fetch and synchronize categories between Admin and Customer.
 * Derives unique categories from both restaurant menus and products, updating reactively.
 */
export const useCategories = (passedProducts = null) => {
  const [categories, setCategories] = useState([]);
  const [categoryNames, setCategoryNames] = useState(['All']);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const [menusData, dishesData] = await Promise.all([
        menuService.getMenus(),
        passedProducts ? Promise.resolve(passedProducts) : productService.getProducts()
      ]);

      const map = new Map();

      let savedDesc = {};
      try {
        savedDesc = JSON.parse(localStorage.getItem('foodie_category_descriptions') || '{}');
      } catch (e) {}

      // 1. Add categories configured in restaurant menus
      (menusData || []).forEach(m => {
        if (!m || !m.name) return;
        const feName = getFrontendCategoryName(m.name);
        const norm = normalizeCategoryName(feName);
        const desc = m.description || savedDesc[m.id] || savedDesc[String(m.id)] || savedDesc[normalizeCategoryName(m.name)] || savedDesc[norm] || '';
        if (!map.has(norm)) {
          map.set(norm, { id: m.id, name: feName, originalName: m.name, description: desc });
        }
      });

      // 2. Add categories present on active dishes
      const dishesToUse = passedProducts || dishesData || [];
      dishesToUse.forEach(d => {
        if (!d || !d.category) return;
        const cat = d.category;
        const feName = getFrontendCategoryName(cat);
        const norm = normalizeCategoryName(feName);
        if (!map.has(norm)) {
          const desc = savedDesc[norm] || savedDesc[normalizeCategoryName(cat)] || '';
          map.set(norm, { id: norm, name: feName, originalName: cat, description: desc });
        }
      });

      const uniqueList = Array.from(map.values());
      setCategories(uniqueList);

      // Check if there are active dishes that qualify as Popular or Discount
      const hasPopular = dishesToUse.some(d => isPopularProduct(d));
      const hasDiscount = dishesToUse.some(d => isDiscountProduct(d));

      const names = ['All'];
      if (hasPopular) names.push('Popular');
      if (hasDiscount) names.push('Discount');
      uniqueList.forEach(c => {
        if (!names.includes(c.name)) {
          names.push(c.name);
        }
      });

      setCategoryNames(names);
    } catch (e) {
      console.error("Error fetching categories in useCategories hook:", e);
    } finally {
      setLoading(false);
    }
  }, [passedProducts]);

  useEffect(() => {
    fetchCategories();

    const handleUpdate = () => {
      fetchCategories();
    };

    window.addEventListener('foodie_categories_updated', handleUpdate);
    window.addEventListener('foodie_products_updated', handleUpdate);
    window.addEventListener('foodie_inventory_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('foodie_categories_updated', handleUpdate);
      window.removeEventListener('foodie_products_updated', handleUpdate);
      window.removeEventListener('foodie_inventory_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [fetchCategories]);

  return {
    categories,
    categoryNames,
    loading,
    refetch: fetchCategories
  };
};

export default useCategories;

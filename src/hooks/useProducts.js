import { useState, useEffect } from 'react';
import { productService, clearStaticProductCache } from '../services/productService';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      clearStaticProductCache();
      const data = await productService.getProducts(true);
      setProducts(data || []);
    } catch (e) {
      setError(e);
    }
    if (showLoading) setLoading(false);
  };

  const fetchProductsSilently = async () => {
    try {
      clearStaticProductCache();
      const data = await productService.getProducts(true);
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();

    const handleSync = () => {
      fetchProductsSilently();
    };

    window.addEventListener('foodie_products_updated', handleSync);
    window.addEventListener('foodie_inventory_updated', handleSync);
    window.addEventListener('foodie_categories_updated', handleSync);
    window.addEventListener('foodie_orders_updated', handleSync);
    window.addEventListener('foodie_top_selling_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('foodie_products_updated', handleSync);
      window.removeEventListener('foodie_inventory_updated', handleSync);
      window.removeEventListener('foodie_categories_updated', handleSync);
      window.removeEventListener('foodie_orders_updated', handleSync);
      window.removeEventListener('foodie_top_selling_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  return { products, loading, error, refetch: () => fetchProducts(true) };
};
export default useProducts;

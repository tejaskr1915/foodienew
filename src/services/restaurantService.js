import api from './api';

const _isValidId = (id) => {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  return s !== '' && s !== 'undefined' && s !== 'null' && s !== 'NaN';
};

export const restaurantService = {
  getRestaurants: async () => {
    const res = await api.get('/restaurants/');
    return res.data;
  },

  getRestaurantById: async (id) => {
    if (!_isValidId(id)) return null;
    const res = await api.get(`/restaurants/${id}/`);
    return res.data;
  },

  createRestaurant: async (data) => {
    const res = await api.post('/restaurants/', data);
    return res.data;
  },

  updateRestaurant: async (id, data) => {
    if (!_isValidId(id)) return null;
    const res = await api.put(`/restaurants/${id}/`, data);
    return res.data;
  },

  deleteRestaurant: async (id) => {
    if (!_isValidId(id)) return true;
    const res = await api.delete(`/restaurants/${id}/`);
    return res.data;
  }
};

export default restaurantService;

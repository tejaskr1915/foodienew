import api from './api';

const _isValidId = (id) => {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  return s !== '' && s !== 'undefined' && s !== 'null' && s !== 'NaN';
};

export const addressService = {
  getAddresses: async () => {
    const res = await api.get('/addresses/');
    return res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.results || []));
  },

  createAddress: async (data) => {
    const res = await api.post('/addresses/', data);
    return res.data?.data || res.data;
  },

  deleteAddress: async (id) => {
    if (!_isValidId(id)) return false;
    await api.delete(`/addresses/${id}/`);
    return true;
  }
};

export default addressService;

import api from './api';

export const paymentService = {
  getPayments: async () => {
    const res = await api.get('/payments/');
    return res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.results || []));
  },

  createPayment: async (data) => {
    const res = await api.post('/payments/', data);
    return res.data?.data || res.data;
  }
};

export default paymentService;

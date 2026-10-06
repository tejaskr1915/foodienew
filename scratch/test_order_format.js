import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function testOrderNumberFormat() {
  const testVal = `ORD_${Date.now()}`;
  try {
    const res = await axios.post(`${API_BASE}/orders/orders/`, {
      order_number: testVal,
      order_type: 'DINE_IN',
      status: 'CONFIRMED',
      total_amount: '350.00',
      subtotal: '333.33',
      discount_amount: '0.00',
      tax_amount: '16.67',
      number_of_diners: 2,
      restaurant: 1,
      table: 3,
      user: 1
    });
    console.log('Order created successfully with backend ID:', res.data?.data?.id || res.data?.id);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testOrderNumberFormat();

import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function testPostOrderWithoutOrderNumber() {
  console.log('Testing POST /orders/orders/ WITHOUT order_number in payload...');
  try {
    const res = await axios.post(`${API_BASE}/orders/orders/`, {
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
    console.log('Success without order_number! Status:', res.status);
    console.log('Response data:', res.data);
  } catch (err) {
    console.log('Failed without order_number:');
    console.log(err.response?.status, err.response?.data);
  }
}

testPostOrderWithoutOrderNumber();

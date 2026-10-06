import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function testBranchOrders() {
  console.log('--- Testing Order Creation for Different Branches ---');

  // Fetch active restaurants
  const resRes = await axios.get(API_BASE + '/restaurant/restaurants/');
  const list = resRes.data?.data || resRes.data;
  console.log('Available branches:');
  list.forEach(r => console.log(`Branch ID: ${r.id}, Name: ${r.name}, Lat: ${r.latitude}, Lon: ${r.longitude}, Active: ${r.is_active}`));

  // Test creating an order for Branch 1
  try {
    const order1 = await axios.post(API_BASE + '/orders/orders/', {
      order_number: `ORD-TEST-B1-${Date.now().toString().slice(-4)}`,
      order_type: 'TAKEAWAY',
      status: 'CONFIRMED',
      total_amount: '150.00',
      subtotal: '150.00',
      discount_amount: '0.00',
      tax_amount: '7.50',
      number_of_diners: 1,
      restaurant: 1,
      user: 1
    });
    console.log('[PASS] Order created for Branch 1:', order1.data?.data?.id || order1.data?.id, 'Restaurant:', order1.data?.data?.restaurant || order1.data?.restaurant);
  } catch (e) {
    console.log('[FAIL] Branch 1 order error:', e.response?.data || e.message);
  }

  // Test creating an order for Branch 2 (Spice Garden)
  try {
    const order2 = await axios.post(API_BASE + '/orders/orders/', {
      order_number: `ORD-TEST-B2-${Date.now().toString().slice(-4)}`,
      order_type: 'TAKEAWAY',
      status: 'CONFIRMED',
      total_amount: '200.00',
      subtotal: '200.00',
      discount_amount: '0.00',
      tax_amount: '10.00',
      number_of_diners: 1,
      restaurant: 2,
      user: 1
    });
    console.log('[PASS] Order created for Branch 2:', order2.data?.data?.id || order2.data?.id, 'Restaurant:', order2.data?.data?.restaurant || order2.data?.restaurant);
  } catch (e) {
    console.log('[FAIL] Branch 2 order error:', e.response?.data || e.message);
  }

  // Test creating an order for Branch 3 (Foodie Restaurant Updated)
  try {
    const order3 = await axios.post(API_BASE + '/orders/orders/', {
      order_number: `ORD-TEST-B3-${Date.now().toString().slice(-4)}`,
      order_type: 'TAKEAWAY',
      status: 'CONFIRMED',
      total_amount: '250.00',
      subtotal: '250.00',
      discount_amount: '0.00',
      tax_amount: '12.50',
      number_of_diners: 1,
      restaurant: 3,
      user: 1
    });
    console.log('[PASS] Order created for Branch 3:', order3.data?.data?.id || order3.data?.id, 'Restaurant:', order3.data?.data?.restaurant || order3.data?.restaurant);
  } catch (e) {
    console.log('[FAIL] Branch 3 order error:', e.response?.data || e.message);
  }
}

testBranchOrders();

import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function testCarts() {
  try {
    const getRes = await axios.get(API_BASE + '/orders/carts/');
    console.log('GET /orders/carts/ status:', getRes.status);
    console.log('GET /orders/carts/ data structure:', typeof getRes.data, Array.isArray(getRes.data) ? 'Array' : Object.keys(getRes.data));
    console.log('GET /orders/carts/ sample:', JSON.stringify(getRes.data, null, 2).slice(0, 1000));

    // Test POST 1
    console.log('\n--- Test POST 1: { restaurant: 1, status: "ACTIVE" } ---');
    try {
      const res1 = await axios.post(API_BASE + '/orders/carts/', { restaurant: 1, status: 'ACTIVE' });
      console.log('POST 1 Success:', res1.status, res1.data);
    } catch (e) {
      console.log('POST 1 Error:', e.response?.status, e.response?.data);
    }

    // Test POST 2
    console.log('\n--- Test POST 2: { restaurant: 1, user: 1, status: "ACTIVE" } ---');
    try {
      const res2 = await axios.post(API_BASE + '/orders/carts/', { restaurant: 1, user: 1, status: 'ACTIVE' });
      console.log('POST 2 Success:', res2.status, res2.data);
    } catch (e) {
      console.log('POST 2 Error:', e.response?.status, e.response?.data);
    }

    // Test POST with session_id
    console.log('\n--- Test POST 3: { restaurant: 1, session_id: "test12345", status: "ACTIVE" } ---');
    try {
      const res3 = await axios.post(API_BASE + '/orders/carts/', { restaurant: 1, session_id: "test12345", status: 'ACTIVE' });
      console.log('POST 3 Success:', res3.status, res3.data);
    } catch (e) {
      console.log('POST 3 Error:', e.response?.status, e.response?.data);
    }

    // Test POST with invalid user (e.g. user_id string or user: "guest")
    console.log('\n--- Test POST 4 (What might cause 400?): { restaurant: 1, user: "guest", status: "ACTIVE" } ---');
    try {
      const res4 = await axios.post(API_BASE + '/orders/carts/', { restaurant: 1, user: "guest", status: 'ACTIVE' });
      console.log('POST 4 Success:', res4.status, res4.data);
    } catch (e) {
      console.log('POST 4 Error:', e.response?.status, e.response?.data);
    }

    console.log('\n--- Test POST 5 (user: null): { restaurant: 1, user: null, status: "ACTIVE" } ---');
    try {
      const res5 = await axios.post(API_BASE + '/orders/carts/', { restaurant: 1, user: null, status: 'ACTIVE' });
      console.log('POST 5 Success:', res5.status, res5.data);
    } catch (e) {
      console.log('POST 5 Error:', e.response?.status, e.response?.data);
    }

    console.log('\n--- Test POST 6 (user_id: 1 vs user: 1): { restaurant_id: 1, user_id: 1, status: "ACTIVE" } ---');
    try {
      const res6 = await axios.post(API_BASE + '/orders/carts/', { restaurant_id: 1, user_id: 1, status: 'ACTIVE' });
      console.log('POST 6 Success:', res6.status, res6.data);
    } catch (e) {
      console.log('POST 6 Error:', e.response?.status, e.response?.data);
    }

  } catch (err) {
    console.error('Fatal test error:', err.message, err.response?.data);
  }
}

testCarts();

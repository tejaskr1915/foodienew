import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function testTableAndUserPayloads() {
  console.log('--- Testing table values in POST /orders/carts/ ---');
  const testCases = [
    { name: 'valid user 27, no table', payload: { restaurant: 1, user: 27, status: 'ACTIVE' } },
    { name: 'invalid table string "T01"', payload: { restaurant: 1, user: 27, table: "T01", status: 'ACTIVE' } },
    { name: 'nonexistent table 99999', payload: { restaurant: 1, user: 27, table: 99999, status: 'ACTIVE' } },
    { name: 'valid table 3', payload: { restaurant: 1, user: 27, table: 3, status: 'ACTIVE' } },
    { name: 'user null, valid table 3', payload: { restaurant: 1, table: 3, status: 'ACTIVE' } },
    { name: 'session_id string', payload: { restaurant: 1, session_id: 'guest_sess_1', status: 'ACTIVE' } },
    { name: 'user string "27"', payload: { restaurant: 1, user: "27", status: 'ACTIVE' } },
    { name: 'user_id field instead of user', payload: { restaurant: 1, user_id: 27, status: 'ACTIVE' } },
  ];

  for (const tc of testCases) {
    try {
      const res = await axios.post(API_BASE + '/orders/carts/', tc.payload);
      console.log(`[PASS] ${tc.name}: Status ${res.status}, cart id ${res.data?.data?.id || res.data?.id}`);
    } catch (e) {
      console.log(`[FAIL] ${tc.name}: Status ${e.response?.status}, Error:`, JSON.stringify(e.response?.data));
    }
  }
}

testTableAndUserPayloads();

import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function inspectRestaurants() {
  try {
    const res = await axios.get(API_BASE + '/restaurant/restaurants/');
    console.log('GET /restaurant/restaurants/ Status:', res.status);
    console.log('GET /restaurant/restaurants/ Data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error fetching restaurants:', err.message, err.response?.data);
  }
}

inspectRestaurants();

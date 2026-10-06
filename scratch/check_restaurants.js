import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function checkRestaurants() {
  try {
    const res = await axios.get(`${API_BASE}/restaurant/restaurants/`);
    console.log('Restaurants:', res.data);
  } catch (e) {
    console.error('Restaurants err:', e.response?.data || e.message);
  }
}
checkRestaurants();

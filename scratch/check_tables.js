import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function checkTables() {
  const res = await axios.get(`${API_BASE}/restaurant/tables/`);
  console.log('Tables:', res.data);
}
checkTables();

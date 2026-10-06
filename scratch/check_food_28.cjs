const axios = require('axios');
const BASE_URL = 'http://localhost:5173/api';

async function main() {
  const res = await axios.get(`${BASE_URL}/restaurant/food/28/`);
  console.log("GET /restaurant/food/28/ response:", JSON.stringify(res.data, null, 2));
}

main();

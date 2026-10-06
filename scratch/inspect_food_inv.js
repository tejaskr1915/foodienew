import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function inspectFoodAndInventory() {
  const foodRes = await axios.get(API_BASE + '/restaurant/food/');
  const foods = foodRes.data?.data || foodRes.data;
  console.log('Sample food record:', JSON.stringify(foods[0], null, 2));

  const invRes = await axios.get(API_BASE + '/restaurant/inventory/');
  const inv = invRes.data?.data || invRes.data;
  console.log('Sample inventory record:', JSON.stringify(inv[0], null, 2));

  const tablesRes = await axios.get(API_BASE + '/restaurant/tables/');
  const tables = tablesRes.data?.data || tablesRes.data;
  console.log('Sample tables record:', JSON.stringify(tables[0], null, 2));
}

inspectFoodAndInventory();

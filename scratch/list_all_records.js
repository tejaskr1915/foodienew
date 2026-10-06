import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function listAll() {
  const usersRes = await axios.get(API_BASE + '/users/users/');
  console.log('All Users in DB:');
  const users = usersRes.data?.data || usersRes.data;
  users.forEach(u => console.log(`User ID: ${u.id}, Phone: ${u.phone}, Username: ${u.username}, Name: ${u.first_name} ${u.last_name}`));

  const cartsRes = await axios.get(API_BASE + '/orders/carts/');
  console.log('\nAll Carts in DB:');
  const carts = cartsRes.data?.data || cartsRes.data;
  carts.forEach(c => console.log(`Cart ID: ${c.id}, User: ${c.user}, Status: ${c.status}, Table: ${c.table}, Restaurant: ${c.restaurant}, Session: ${c.session_id}`));

  const tablesRes = await axios.get(API_BASE + '/restaurant/tables/');
  console.log('\nAll Tables in DB:');
  const tables = tablesRes.data?.data || tablesRes.data;
  tables.forEach(t => console.log(`Table PK ID: ${t.id}, Table Number: ${t.table_number || t.number}`));
}

listAll();

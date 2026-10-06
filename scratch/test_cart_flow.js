import axios from 'axios';

const API_BASE = 'http://192.168.150.171:8000/api';

async function testCartFlow() {
  console.log('--- 1. Testing GET /orders/carts/ ---');
  const cartsRes = await axios.get(`${API_BASE}/orders/carts/`);
  console.log('Carts response status:', cartsRes.status);
  const carts = Array.isArray(cartsRes.data?.data) ? cartsRes.data.data : (Array.isArray(cartsRes.data) ? cartsRes.data : cartsRes.data?.results || []);
  console.log(`Found ${carts.length} carts.`);

  let targetCart = carts.find(c => c.status === 'ACTIVE' || c.status === 'OPEN');
  if (!targetCart) {
    console.log('Creating an active cart for testing...');
    const createRes = await axios.post(`${API_BASE}/orders/carts/`, {
      restaurant: 1,
      status: 'ACTIVE'
    });
    targetCart = createRes.data?.data || createRes.data;
  }
  console.log('Target Cart ID:', targetCart.id);

  console.log('\n--- 2. Testing POST /orders/cart-items/ ---');
  // Add item with food: 1 (or any available food ID)
  const foodsRes = await axios.get(`${API_BASE}/restaurant/food/`);
  const foods = Array.isArray(foodsRes.data?.data) ? foodsRes.data.data : (Array.isArray(foodsRes.data) ? foodsRes.data : foodsRes.data?.results || []);
  const sampleFood = foods[0] || { id: 1, price: '120.00' };
  console.log(`Using sample food ID ${sampleFood.id} (${sampleFood.name || 'Sample Food'})`);

  const addItemRes = await axios.post(`${API_BASE}/orders/cart-items/`, {
    cart: targetCart.id,
    food: sampleFood.id,
    quantity: 1,
    unit_price: String(Number(sampleFood.price || 100).toFixed(2)),
    subtotal: String(Number(sampleFood.price || 100).toFixed(2)),
    special_instructions: "Test cart item"
  });
  const addedItem = addItemRes.data?.data || addItemRes.data;
  console.log('Cart item created successfully:', addedItem);
  const cartItemId = addedItem.id;
  console.log(`Real Backend Cart Item ID: ${cartItemId}`);

  console.log('\n--- 3. Testing GET /orders/cart-items/ ---');
  const itemsRes = await axios.get(`${API_BASE}/orders/cart-items/`);
  const allItems = Array.isArray(itemsRes.data?.data) ? itemsRes.data.data : (Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data?.results || []);
  const verifyFound = allItems.find(i => i.id === cartItemId);
  console.log('Item found in backend GET:', !!verifyFound, verifyFound?.id);

  console.log(`\n--- 4. Testing DELETE /orders/cart-items/${cartItemId}/ ---`);
  const deleteRes = await axios.delete(`${API_BASE}/orders/cart-items/${cartItemId}/`);
  console.log('DELETE status:', deleteRes.status);
  console.log('DELETE response body:', deleteRes.data);

  console.log('\n--- 5. Verifying item is no longer in backend database ---');
  const afterDeleteRes = await axios.get(`${API_BASE}/orders/cart-items/`);
  const afterItems = Array.isArray(afterDeleteRes.data?.data) ? afterDeleteRes.data.data : (Array.isArray(afterDeleteRes.data) ? afterDeleteRes.data : afterDeleteRes.data?.results || []);
  const stillExists = afterItems.some(i => i.id === cartItemId);
  console.log('Item still exists after DELETE?:', stillExists);

  console.log('\n--- 6. Verifying 404 on deleting non-existent ID ---');
  try {
    await axios.delete(`${API_BASE}/orders/cart-items/${cartItemId}/`);
    console.log('Expected 404 but got 200');
  } catch (err) {
    console.log('Expected 404 received correctly:', err.response?.status, err.response?.statusText);
  }
}

testCartFlow().catch(console.error);

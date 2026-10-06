import axios from 'axios';
const API_BASE = 'http://192.168.150.171:8000/api';

async function testCartFlow() {
  console.log('--- Testing Complete Cart Flow ---');
  
  // 1. Get existing carts
  const cartsRes = await axios.get(API_BASE + '/orders/carts/');
  const carts = cartsRes.data?.data || cartsRes.data;
  console.log(`Fetched ${carts.length} carts successfully.`);

  // 2. Find active cart for user 1
  let user1Cart = carts.find(c => Number(c.user) === 1 && c.status === 'ACTIVE');
  if (user1Cart) {
    console.log(`[REUSED] Found existing active cart ${user1Cart.id} for user 1. No POST needed!`);
  } else {
    const createRes = await axios.post(API_BASE + '/orders/carts/', { restaurant: 1, user: 1, status: 'ACTIVE' });
    user1Cart = createRes.data?.data || createRes.data;
    console.log(`[CREATED] Created new cart ${user1Cart.id} for user 1.`);
  }

  // 3. Add item to user1Cart
  const foodRes = await axios.get(API_BASE + '/restaurant/food/');
  const foods = foodRes.data?.data || foodRes.data;
  const food1 = foods[0];
  console.log(`Adding food item ${food1.id} (${food1.name}) to cart ${user1Cart.id}...`);

  const itemPayload = {
    cart: user1Cart.id,
    food: food1.id,
    quantity: 1,
    unit_price: String(parseFloat(food1.price || '100').toFixed(2)),
    subtotal: String(parseFloat(food1.price || '100').toFixed(2)),
    special_instructions: "",
    extra_ingredients: [],
    extra_ingredient_amount: "0.00"
  };

  const addItemRes = await axios.post(API_BASE + '/orders/cart-items/', itemPayload);
  console.log(`[ADDED] Cart item created with ID ${addItemRes.data?.data?.id || addItemRes.data?.id}`);

  // 4. Delete item to keep database clean
  const cartItemId = addItemRes.data?.data?.id || addItemRes.data?.id;
  const delRes = await axios.delete(`${API_BASE}/orders/cart-items/${cartItemId}/`);
  console.log(`[DELETED] Cart item ${cartItemId} deleted. Status: ${delRes.status}`);
}

testCartFlow();

const axios = require('axios');

async function runTests() {
  console.log('=== STEP 1: Verify Backend Database Orders & Items ===');
  const ordersRes = await axios.get('http://192.168.150.171:8000/api/orders/orders/');
  const itemsRes = await axios.get('http://192.168.150.171:8000/api/orders/order-items/');
  const foodsRes = await axios.get('http://192.168.150.171:8000/api/restaurant/food/');
  
  const orders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.data;
  const items = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.data;
  const foods = Array.isArray(foodsRes.data) ? foodsRes.data : foodsRes.data.data;

  console.log('Total Backend Orders:', orders.length);
  console.log('Total Backend Items:', items.length);
  console.log('Total Backend Foods:', foods.length);

  console.log('\n=== STEP 2: Create Test Order for Branch 3 (Customer A) ===');
  const orderA = await axios.post('http://192.168.150.171:8000/api/orders/orders/', {
    order_number: 'ORD-TEST-BRANCH3-' + Date.now(),
    order_type: 'DINE_IN',
    status: 'CONFIRMED',
    total_amount: '350.00',
    subtotal: '333.33',
    tax_amount: '16.67',
    number_of_diners: 2,
    restaurant: 3,
    user: 1
  });
  const idA = orderA.data.data?.id || orderA.data.id;
  console.log(`Order A created: ID #${idA} (restaurant: 3)`);

  const itemA = await axios.post('http://192.168.150.171:8000/api/orders/order-items/', {
    order: idA,
    food: 8,
    quantity: 2,
    unit_price: '166.67',
    subtotal: '333.33',
    special_instructions: 'Less oil please'
  });
  console.log(`Order A item created: food #8 x2, instructions: "${itemA.data.data?.special_instructions || itemA.data.special_instructions}"`);

  console.log('\n=== STEP 3: Create Test Order for Branch 2 (Customer B) ===');
  const orderB = await axios.post('http://192.168.150.171:8000/api/orders/orders/', {
    order_number: 'ORD-TEST-BRANCH2-' + Date.now(),
    order_type: 'TAKEAWAY',
    status: 'CONFIRMED',
    total_amount: '222.00',
    subtotal: '211.43',
    tax_amount: '10.57',
    number_of_diners: 1,
    restaurant: 2,
    user: 3
  });
  const idB = orderB.data.data?.id || orderB.data.id;
  console.log(`Order B created: ID #${idB} (restaurant: 2)`);

  await axios.post('http://192.168.150.171:8000/api/orders/order-items/', {
    order: idB,
    food: 8,
    quantity: 1,
    unit_price: '211.43',
    subtotal: '211.43',
    special_instructions: 'Pack separately'
  });
  console.log(`Order B item created for #${idB}`);

  console.log('\n=== STEP 4: Test Kitchen Status Transitions for Order A ===');
  // 1. Accept -> PREPARING
  const patchPrep = await axios.patch(`http://192.168.150.171:8000/api/orders/orders/${idA}/`, { status: 'PREPARING' });
  console.log(`Order #${idA} -> PREPARING status:`, patchPrep.data.data?.status || patchPrep.data.status);

  // 2. Mark Ready -> READY
  const patchReady = await axios.patch(`http://192.168.150.171:8000/api/orders/orders/${idA}/`, { status: 'READY' });
  console.log(`Order #${idA} -> READY status:`, patchReady.data.data?.status || patchReady.data.status);

  // 3. Mark Serving / Complete -> COMPLETED
  const patchDone = await axios.patch(`http://192.168.150.171:8000/api/orders/orders/${idA}/`, { status: 'COMPLETED' });
  console.log(`Order #${idA} -> COMPLETED status:`, patchDone.data.data?.status || patchDone.data.status);

  console.log('\n=== ALL API TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Test failed:', err.response?.data || err.message);
  process.exit(1);
});

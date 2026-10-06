import axios from 'axios';

const API_BASE = 'http://192.168.150.171:8000/api';

async function testCompleteFlow() {
  console.log('====================================================');
  console.log('STEP 1: Test GET /orders/carts/ & Add to Cart');
  console.log('====================================================');
  const cartsRes = await axios.get(`${API_BASE}/orders/carts/`);
  console.log('GET /orders/carts/ status:', cartsRes.status);
  const carts = Array.isArray(cartsRes.data?.data) ? cartsRes.data.data : (Array.isArray(cartsRes.data) ? cartsRes.data : cartsRes.data?.results || []);
  let targetCart = carts.find(c => c.status === 'ACTIVE' || c.status === 'OPEN');
  if (!targetCart) {
    const createRes = await axios.post(`${API_BASE}/orders/carts/`, {
      restaurant: 1,
      status: 'ACTIVE'
    });
    targetCart = createRes.data?.data || createRes.data;
  }
  console.log('Active Cart ID:', targetCart.id);

  console.log('\n====================================================');
  console.log('STEP 2: Add Item to Cart (POST /orders/cart-items/)');
  console.log('====================================================');
  const addRes = await axios.post(`${API_BASE}/orders/cart-items/`, {
    cart: targetCart.id,
    food: 8, // Veg Burger
    quantity: 2,
    unit_price: '222.00',
    subtotal: '444.00',
    special_instructions: 'Less Spicy'
  });
  const cartItem = addRes.data?.data || addRes.data;
  console.log('Created Cart Item:', { id: cartItem.id, cart: cartItem.cart, food: cartItem.food, quantity: cartItem.quantity });
  const cartItemId = cartItem.id;

  console.log('\n====================================================');
  console.log('STEP 3: Delete Cart Item (DELETE /orders/cart-items/{id}/)');
  console.log('====================================================');
  const deleteRes = await axios.delete(`${API_BASE}/orders/cart-items/${cartItemId}/`);
  console.log('DELETE status:', deleteRes.status);
  console.log('DELETE response:', deleteRes.data);

  console.log('\n====================================================');
  console.log('STEP 4: Place Real Order (POST /orders/orders/)');
  console.log('====================================================');
  const nowIso = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const orderNumber = `ORD-${nowIso}-${randNum}`;

  const orderPayload = {
    order_number: orderNumber,
    order_type: 'DINE_IN',
    status: 'CONFIRMED',
    total_amount: '466.20',
    subtotal: '444.00',
    discount_amount: '0.00',
    tax_amount: '22.20',
    number_of_diners: 2,
    restaurant: 1,
    table: 3,
    user: 1
  };

  const orderRes = await axios.post(`${API_BASE}/orders/orders/`, orderPayload);
  const createdOrder = orderRes.data?.data || orderRes.data;
  console.log('Order created successfully:', {
    id: createdOrder.id,
    order_number: createdOrder.order_number,
    status: createdOrder.status,
    total_amount: createdOrder.total_amount
  });
  const backendOrderId = createdOrder.id;

  console.log('\n====================================================');
  console.log('STEP 5: Add Order Items (POST /orders/order-items/)');
  console.log('====================================================');
  const orderItemRes = await axios.post(`${API_BASE}/orders/order-items/`, {
    order: backendOrderId,
    food: 8,
    quantity: 2,
    unit_price: '222.00',
    subtotal: '444.00',
    special_instructions: 'Less Spicy'
  });
  console.log('Order Item created status:', orderItemRes.status);

  console.log('\n====================================================');
  console.log('STEP 6: Add Payment (POST /orders/payments/)');
  console.log('====================================================');
  const paymentRes = await axios.post(`${API_BASE}/orders/payments/`, {
    order: backendOrderId,
    amount: '466.20',
    payment_method: 'CASH',
    status: 'PENDING',
    transaction_id: `TXN_CASH_${Math.floor(100000 + Math.random() * 900000)}`
  });
  console.log('Payment created status:', paymentRes.status);

  console.log('\n====================================================');
  console.log('STEP 7: Order Tracking Lookup (GET /orders/orders/{id}/)');
  console.log('====================================================');
  const trackRes = await axios.get(`${API_BASE}/orders/orders/${backendOrderId}/`);
  const fetchedOrder = trackRes.data?.data || trackRes.data;
  console.log('Track Order fetched by ID:', {
    id: fetchedOrder.id,
    order_number: fetchedOrder.order_number,
    status: fetchedOrder.status,
    total: fetchedOrder.total_amount
  });

  console.log('\n====================================================');
  console.log('ALL API FLOWS PASSED SUCCESSFULLY WITH ZERO ERRORS');
  console.log('====================================================');
}

testCompleteFlow().catch(err => {
  console.error('Test Flow Error:', err.response?.data || err.message);
  process.exit(1);
});

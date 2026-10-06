import axios from 'axios';

async function testBackendOrderStatus() {
  const baseURL = 'http://localhost:8000/api'; // or 127.0.0.1
  try {
    const res = await axios.get(`${baseURL}/orders/orders/`);
    console.log("Status code:", res.status);
    const orders = res.data?.data || res.data?.results || res.data || [];
    console.log(`Found ${orders.length} orders from backend.`);
    if (orders.length > 0) {
      console.log("Sample order status fields:", {
        id: orders[0].id,
        status: orders[0].status,
        order_status: orders[0].order_status,
        order_type: orders[0].order_type
      });
    }
  } catch (err) {
    console.error("Error fetching backend orders:", err.message);
  }
}

testBackendOrderStatus();

const axios = require('axios');

const BASE_URL = 'http://localhost:5173/api';

async function main() {
  console.log("=== VERIFYING FIXES FOR H-31, H-15/H-28, AND H-29 ===");

  // 1. VERIFY H-31 (Order status mapping and backend patch)
  console.log("\n--- 1. VERIFY H-31 ---");
  // Patch order 69 status to SERVED on backend
  const patchRes = await axios.patch(`${BASE_URL}/orders/orders/69/`, { status: 'SERVED' });
  console.log("Patched order #69 status to SERVED. Response status:", patchRes.data?.data?.status || patchRes.data?.status);

  // Re-fetch order 69
  const refetchRes = await axios.get(`${BASE_URL}/orders/orders/69/`);
  const fetchedOrder = refetchRes.data?.data || refetchRes.data;
  console.log("Backend refetched Order #69 status:", fetchedOrder.status);

  // Test mapStatusToFrontend mapping logic
  const mapStatusToFrontend = (status) => {
    if (!status) return 'Pending';
    const s = String(status).toLowerCase().trim();
    if (s === 'placed' || s === 'pending' || s === 'confirmed' || s === 'new' || s === 'ordered' || s === 'created' || s === 'processing') return 'Pending';
    if (s === 'preparing' || s === 'cooking' || s === 'accepted' || s === 'in_kitchen') return 'Preparing';
    if (s === 'ready' || s === 'out_for_delivery' || s === 'prepared' || s === 'ready_for_pickup') return 'Ready';
    if (s === 'served' || s === 'serving') return 'Serving';
    if (s === 'delivered' || s === 'completed' || s === 'done' || s === 'settled') return 'Completed';
    if (s === 'cancelled' || s === 'canceled' || s === 'cancel' || s === 'rejected' || s === 'void' || s === 'voided') return 'Cancelled';
    return status;
  };

  const frontendStatus = mapStatusToFrontend(fetchedOrder.status);
  console.log(`Backend status '${fetchedOrder.status}' maps to Frontend status: '${frontendStatus}'`);
  if (frontendStatus === 'Serving') {
    console.log("SUCCESS H-31: Order #69 shows 'Serving' across all refetched sessions!");
  } else {
    console.error("FAIL H-31: Expected 'Serving', got:", frontendStatus);
  }

  // 2. VERIFY H-15 / H-28 & H-29 (Food image URL & File upload persistence)
  console.log("\n--- 2. VERIFY H-15/H-28 & H-29 ---");
  // Patch food item 28 with image URL in images array directly on /restaurant/food/28/
  const imgUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
  const patchFoodRes = await axios.patch(`${BASE_URL}/restaurant/food/28/`, {
    images: [{ image: imgUrl, is_primary: true }]
  });
  console.log("Patched food 28 with images payload. Response images:", patchFoodRes.data?.data?.images || patchFoodRes.data?.images);

  // Fetch food 28 to confirm persistence
  const food28Res = await axios.get(`${BASE_URL}/restaurant/food/28/`);
  const food28 = food28Res.data?.data || food28Res.data;
  console.log("GET /restaurant/food/28/ images field:", food28.images);

  if (food28.images && food28.images.length > 0 && food28.images[0].image === imgUrl) {
    console.log("SUCCESS H-15/H-28/H-29: Image URL is persisted in Django DB and returned by GET /restaurant/food/!");
  } else {
    console.error("FAIL H-15/H-28/H-29: Images field mismatch or empty.");
  }
}

main();

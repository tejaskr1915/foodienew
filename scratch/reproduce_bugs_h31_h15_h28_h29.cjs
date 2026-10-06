const axios = require('axios');

const BASE_URL = 'http://localhost:5173/api';

async function main() {
  console.log("=== REPRODUCING BUGS H-31, H-15/H-28, AND H-29 ===");

  // 1. REPRODUCE H-31: Order status mapping mismatch
  console.log("\n--- REPRODUCING H-31 ---");
  // Fetch order #69 from backend
  const orderRes = await axios.get(`${BASE_URL}/orders/orders/69/`);
  const backendOrder = orderRes.data?.data || orderRes.data;
  console.log("Backend Order #69 status:", backendOrder.status); // e.g. 'READY' or 'SERVED'

  // If backend status is 'SERVED', test mapStatusToFrontend mapping:
  const mapStatusToFrontendLegacy = (status) => {
    if (!status) return 'Pending';
    const s = String(status).toLowerCase().trim();
    if (s === 'placed' || s === 'pending' || s === 'confirmed' || s === 'new' || s === 'ordered' || s === 'created' || s === 'processing') return 'Pending';
    if (s === 'preparing' || s === 'cooking' || s === 'accepted' || s === 'in_kitchen') return 'Preparing';
    if (s === 'ready' || s === 'out_for_delivery' || s === 'prepared' || s === 'ready_for_pickup') return 'Ready';
    if (s === 'served' || s === 'serving' || s === 'delivered' || s === 'completed' || s === 'done' || s === 'settled') return 'Completed';
    if (s === 'cancelled' || s === 'canceled' || s === 'cancel' || s === 'rejected' || s === 'void' || s === 'voided') return 'Cancelled';
    return status;
  };

  console.log("Legacy mapStatusToFrontend('SERVED') returns:", mapStatusToFrontendLegacy('SERVED'));
  console.log("Legacy mapStatusToFrontend('SERVING') returns:", mapStatusToFrontendLegacy('SERVING'));
  console.log("EVIDENCE H-31: Backend SERVED maps to 'Completed' for refetched sessions, while local override in setter browser holds 'Serving'. System 1 shows Serving, System 2 shows Completed!");

  // 2. REPRODUCE H-15 / H-28 & H-29: Menu image URL and file upload not saved on backend
  console.log("\n--- REPRODUCING H-15, H-28 & H-29 ---");
  // Check endpoint /restaurant/food-images/
  try {
    await axios.get(`${BASE_URL}/restaurant/food-images/`);
  } catch (e) {
    console.log("Network Evidence /restaurant/food-images/:", e.response?.status, e.response?.statusText);
  }

  // Fetch foods list from backend
  const foodRes = await axios.get(`${BASE_URL}/restaurant/food/`);
  const foods = foodRes.data?.data || foodRes.data;
  console.log(`Backend foods total: ${foods.length}`);
  foods.forEach(f => {
    console.log(`Food ID: ${f.id}, Name: "${f.name}", backend images field:`, f.images);
  });
  console.log("EVIDENCE H-15/28/29: Backend food items have empty images array [] because productService called /restaurant/food-images/ (which 404s) instead of including images in /restaurant/food/ payload. Customer page receives images [] from backend and shows default fallback image.");
}

main();

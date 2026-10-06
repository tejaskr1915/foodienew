const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173/api';

async function main() {
  console.log("=== INSPECTING BACKEND ENDPOINTS AND SERIALIZERS ===");

  try {
    // 1. Inspect GET /orders/orders/
    console.log("\n--- 1. GET /orders/orders/ ---");
    const ordersRes = await axios.get(`${BASE_URL}/orders/orders/`);
    console.log("Status:", ordersRes.status);
    const orders = ordersRes.data?.data || ordersRes.data;
    console.log("Sample order:", Array.isArray(orders) ? orders[0] : orders);

    // 2. Inspect OPTIONS /orders/orders/
    try {
      const optionsOrders = await axios.options(`${BASE_URL}/orders/orders/`);
      console.log("OPTIONS /orders/orders/ status choices / fields:", JSON.stringify(optionsOrders.data?.actions?.POST?.status || optionsOrders.data, null, 2));
    } catch (e) {
      console.log("OPTIONS /orders/orders/ failed or not supported:", e.message);
    }

    // 3. Inspect GET /restaurant/food/
    console.log("\n--- 2. GET /restaurant/food/ ---");
    const foodRes = await axios.get(`${BASE_URL}/restaurant/food/`);
    console.log("Status:", foodRes.status);
    const foods = foodRes.data?.data || foodRes.data;
    console.log("Sample food item:", Array.isArray(foods) ? foods[0] : foods);

    // 4. Inspect OPTIONS /restaurant/food/
    try {
      const optionsFood = await axios.options(`${BASE_URL}/restaurant/food/`);
      console.log("OPTIONS /restaurant/food/ fields:", JSON.stringify(optionsFood.data?.actions?.POST || optionsFood.data, null, 2));
    } catch (e) {
      console.log("OPTIONS /restaurant/food/ failed or not supported:", e.message);
    }

    // 5. Inspect GET /restaurant/food-images/
    console.log("\n--- 3. GET /restaurant/food-images/ ---");
    const imgRes = await axios.get(`${BASE_URL}/restaurant/food-images/`);
    console.log("Status:", imgRes.status);
    const imgs = imgRes.data?.data || imgRes.data;
    console.log("Sample food image:", Array.isArray(imgs) ? imgs[0] : imgs);

    // 6. Inspect OPTIONS /restaurant/food-images/
    try {
      const optionsImg = await axios.options(`${BASE_URL}/restaurant/food-images/`);
      console.log("OPTIONS /restaurant/food-images/ fields:", JSON.stringify(optionsImg.data?.actions?.POST || optionsImg.data, null, 2));
    } catch (e) {
      console.log("OPTIONS /restaurant/food-images/ failed or not supported:", e.message);
    }

    // 7. Test POST /restaurant/food-images/ with URL payload
    console.log("\n--- 4. Test POST /restaurant/food-images/ with JSON (image_url) ---");
    try {
      const testJsonImg = await axios.post(`${BASE_URL}/restaurant/food-images/`, {
        food: foods[0]?.id || 1,
        food_item: foods[0]?.id || 1,
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
        is_primary: true
      });
      console.log("JSON POST image success:", testJsonImg.data);
    } catch (e) {
      console.log("JSON POST image error:", e.response?.status, e.response?.data || e.message);
    }

    // 8. Test POST /restaurant/food-images/ with FormData (File upload)
    console.log("\n--- 5. Test POST /restaurant/food-images/ with FormData (file upload) ---");
    try {
      const form = new FormData();
      // create dummy 1x1 png or text buffer as image
      const dummyBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      form.append('food', String(foods[0]?.id || 1));
      form.append('food_item', String(foods[0]?.id || 1));
      form.append('image', dummyBuffer, { filename: 'test.png', contentType: 'image/png' });
      form.append('images', dummyBuffer, { filename: 'test.png', contentType: 'image/png' });
      form.append('is_primary', 'true');

      const filePostRes = await axios.post(`${BASE_URL}/restaurant/food-images/`, form, {
        headers: form.getHeaders()
      });
      console.log("FormData POST image success:", filePostRes.data);
    } catch (e) {
      console.log("FormData POST image error:", e.response?.status, e.response?.data || e.message);
    }

  } catch (err) {
    console.error("Main execution error:", err.message);
  }
}

main();

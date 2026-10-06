const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:5173/api';

async function main() {
  console.log("=== DETAILED BACKEND INSPECTION ===");

  // 1. Discover endpoints under /restaurant/
  const testEndpoints = [
    '/restaurant/food/',
    '/restaurant/categories/',
    '/restaurant/inventory/',
    '/restaurant/tables/',
    '/restaurant/restaurants/',
    '/restaurant/food-images/',
    '/restaurant/food_images/',
    '/restaurant/images/'
  ];

  for (const ep of testEndpoints) {
    try {
      const res = await axios.get(`${BASE_URL}${ep}`);
      console.log(`GET ${ep} -> Status ${res.status}`);
    } catch (e) {
      console.log(`GET ${ep} -> Error ${e.response?.status || e.message}`);
    }
  }

  // 2. Test patching food object with image, image_url, image_path, photo, etc.
  console.log("\n--- Testing PATCH /restaurant/food/28/ with image fields ---");
  const testFields = ['image', 'image_url', 'image_path', 'photo', 'img'];
  for (const field of testFields) {
    try {
      const patchRes = await axios.patch(`${BASE_URL}/restaurant/food/28/`, {
        [field]: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
      });
      console.log(`PATCH with '${field}' succeeded! Returned keys:`, Object.keys(patchRes.data?.data || patchRes.data));
      console.log("Returned data:", patchRes.data?.data || patchRes.data);
    } catch (e) {
      console.log(`PATCH with '${field}' failed:`, e.response?.status, e.response?.data || e.message);
    }
  }

  // 3. Test sending multipart/form-data directly to /restaurant/food/28/ or /restaurant/food/
  console.log("\n--- Testing multipart/form-data upload to /restaurant/food/28/ ---");
  try {
    const form = new FormData();
    const dummyBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    form.append('image', dummyBuffer, { filename: 'test.png', contentType: 'image/png' });
    const filePatchRes = await axios.patch(`${BASE_URL}/restaurant/food/28/`, form, {
      headers: form.getHeaders()
    });
    console.log("Multipart PATCH to /restaurant/food/28/ succeeded! Data:", filePatchRes.data);
  } catch (e) {
    console.log("Multipart PATCH to /restaurant/food/28/ failed:", e.response?.status, e.response?.data || e.message);
  }

  // 4. Also test POST multipart/form-data to /restaurant/food/
  console.log("\n--- Testing multipart/form-data POST to /restaurant/food/ ---");
  try {
    const form = new FormData();
    const dummyBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    form.append('name', 'Test Dish File Upload');
    form.append('price', '150.00');
    form.append('category', '45');
    form.append('restaurant', '1');
    form.append('image', dummyBuffer, { filename: 'test.png', contentType: 'image/png' });
    const filePostRes = await axios.post(`${BASE_URL}/restaurant/food/`, form, {
      headers: form.getHeaders()
    });
    console.log("Multipart POST to /restaurant/food/ succeeded! Data:", filePostRes.data);
  } catch (e) {
    console.log("Multipart POST to /restaurant/food/ failed:", e.response?.status, e.response?.data || e.message);
  }
}

main();

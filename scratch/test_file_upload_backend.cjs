const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:5173/api';

async function main() {
  console.log("=== TESTING FILE UPLOAD FORMATS ON /restaurant/food/ ===");
  const dummyBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  // Test 1: FormData with 'images' array field name
  try {
    const form1 = new FormData();
    form1.append('images[0]image', dummyBuffer, { filename: 'upload_test.png', contentType: 'image/png' });
    form1.append('images[0]is_primary', 'true');
    const res1 = await axios.patch(`${BASE_URL}/restaurant/food/28/`, form1, { headers: form1.getHeaders() });
    console.log("Format 1 (images[0]image):", res1.data?.data?.images);
  } catch (e) {
    console.log("Format 1 failed:", e.response?.status, e.response?.data || e.message);
  }

  // Test 2: FormData with JSON stringified images or base64 data URI in images array
  try {
    const base64DataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res2 = await axios.patch(`${BASE_URL}/restaurant/food/28/`, {
      images: [
        { image: base64DataUri, is_primary: true }
      ]
    });
    console.log("Format 2 (Base64 data URI in images array):", res2.data?.data?.images ? "PERSISTED SUCCESSFULLY" : "FAILED");
  } catch (e) {
    console.log("Format 2 failed:", e.response?.status, e.response?.data || e.message);
  }
}

main();

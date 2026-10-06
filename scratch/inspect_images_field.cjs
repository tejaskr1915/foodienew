const axios = require('axios');

const BASE_URL = 'http://localhost:5173/api';

async function main() {
  console.log("=== INSPECTING ALL FOOD ITEMS FOR IMAGES ===");
  const res = await axios.get(`${BASE_URL}/restaurant/food/`);
  const foods = res.data?.data || res.data;
  console.log(`Total food items: ${foods.length}`);
  
  const foodsWithImages = foods.filter(f => f.images && f.images.length > 0);
  console.log(`Food items with non-empty 'images' array: ${foodsWithImages.length}`);
  if (foodsWithImages.length > 0) {
    console.log("Sample non-empty images array:", JSON.stringify(foodsWithImages[0].images, null, 2));
  } else {
    console.log("ALL food items in backend returned 'images: []'.");
  }

  // Let's test if PATCH /restaurant/food/28/ accepts nested `images` or `image` or `image_url`
  console.log("\n--- Testing PATCH with nested images array ---");
  try {
    const testPatch = await axios.patch(`${BASE_URL}/restaurant/food/28/`, {
      images: [
        { image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500', is_primary: true }
      ]
    });
    console.log("PATCH with images array response:", testPatch.data?.data?.images);
  } catch (e) {
    console.log("PATCH with images array error:", e.response?.status, e.response?.data || e.message);
  }

  // Check OPTIONS for food detail endpoint
  try {
    const optRes = await axios.options(`${BASE_URL}/restaurant/food/28/`);
    console.log("OPTIONS /restaurant/food/28/ data:", JSON.stringify(optRes.data, null, 2));
  } catch (e) {
    console.log("OPTIONS /restaurant/food/28/ error:", e.message);
  }
}

main();

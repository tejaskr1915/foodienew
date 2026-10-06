import axios from 'axios';

async function testDuplicateTablePost() {
  const baseURL = 'http://192.168.150.171:8000/api';

  console.log("=== Testing duplicate table_number POST ===");
  try {
    // 1. Create table 88
    const post1 = await axios.post(`${baseURL}/restaurant/tables/`, {
      table_number: '88',
      capacity: 4,
      restaurant: 1
    });
    console.log("First POST (88) Status:", post1.status);
    const createdId = post1.data?.data?.id || post1.data?.id;

    // 2. Post table 88 AGAIN (duplicate)
    try {
      await axios.post(`${baseURL}/restaurant/tables/`, {
        table_number: '88',
        capacity: 4,
        restaurant: 1
      });
    } catch (dupErr) {
      console.log("Duplicate POST Status:", dupErr.response?.status);
      console.log("Duplicate POST Error Data:", JSON.stringify(dupErr.response?.data, null, 2));
    }

    // Clean up
    if (createdId) {
      await axios.delete(`${baseURL}/restaurant/tables/${createdId}/`);
      console.log("Cleaned up table 88 ID:", createdId);
    }
  } catch (err) {
    console.error("Test error:", err.response ? JSON.stringify(err.response.data) : err.message);
  }
}

testDuplicateTablePost();

import axios from 'axios';

async function testTablesAPI() {
  const urls = [
    'http://192.168.150.171:8000/api',
    'http://127.0.0.1:5173/api',
    'http://localhost:5173/api'
  ];

  let baseURL = null;
  for (const u of urls) {
    try {
      const res = await axios.get(`${u}/restaurant/tables/`);
      console.log(`Successfully connected to ${u}`);
      baseURL = u;
      break;
    } catch (e) {
      if (e.response) {
        console.log(`Connected to ${u} with status ${e.response.status}`);
        baseURL = u;
        break;
      }
    }
  }

  if (!baseURL) {
    console.error("Could not connect to any API URL");
    return;
  }

  try {
    console.log(`\n=== GET ${baseURL}/restaurant/tables/ ===`);
    const getRes = await axios.get(`${baseURL}/restaurant/tables/`);
    console.log("GET Status:", getRes.status);
    const tables = getRes.data?.data || (Array.isArray(getRes.data) ? getRes.data : (getRes.data?.results || []));
    console.log("Sample existing table fields:", tables.length > 0 ? tables[0] : "No tables found");

    console.log(`\n=== OPTIONS ${baseURL}/restaurant/tables/ ===`);
    try {
      const optRes = await axios.options(`${baseURL}/restaurant/tables/`);
      console.log("OPTIONS actions POST:", JSON.stringify(optRes.data?.actions?.POST || optRes.data, null, 2));
    } catch (optErr) {
      console.log("OPTIONS error:", optErr.message);
    }

    console.log(`\n=== Testing payload variants for POST ${baseURL}/restaurant/tables/ ===`);
    
    // Variant 1: table_number integer, capacity, restaurant, is_available
    console.log("\nAttempting Variant 1 (table_number: 99 int, capacity: 4, restaurant: 1, is_available: true):");
    try {
      const post1 = await axios.post(`${baseURL}/restaurant/tables/`, {
        table_number: 99,
        capacity: 4,
        is_available: true,
        restaurant: 1
      });
      console.log("Variant 1 SUCCESS:", post1.status, post1.data);
      const createdId = post1.data?.id || post1.data?.data?.id;
      if (createdId) await axios.delete(`${baseURL}/restaurant/tables/${createdId}/`);
    } catch (e1) {
      console.log("Variant 1 Error Status:", e1.response?.status);
      console.log("Variant 1 Error Data:", JSON.stringify(e1.response?.data, null, 2));
    }

    // Variant 2: table_number string "99"
    console.log("\nAttempting Variant 2 (table_number: '99' string):");
    try {
      const post2 = await axios.post(`${baseURL}/restaurant/tables/`, {
        table_number: "99",
        capacity: 4,
        is_available: true,
        restaurant: 1
      });
      console.log("Variant 2 SUCCESS:", post2.status, post2.data);
      const createdId = post2.data?.id || post2.data?.data?.id;
      if (createdId) await axios.delete(`${baseURL}/restaurant/tables/${createdId}/`);
    } catch (e2) {
      console.log("Variant 2 Error Status:", e2.response?.status);
      console.log("Variant 2 Error Data:", JSON.stringify(e2.response?.data, null, 2));
    }

    // Variant 3: table_number string "T99"
    console.log("\nAttempting Variant 3 (table_number: 'T99' string):");
    try {
      const post3 = await axios.post(`${baseURL}/restaurant/tables/`, {
        table_number: "T99",
        capacity: 4,
        is_available: true,
        restaurant: 1
      });
      console.log("Variant 3 SUCCESS:", post3.status, post3.data);
      const createdId = post3.data?.id || post3.data?.data?.id;
      if (createdId) await axios.delete(`${baseURL}/restaurant/tables/${createdId}/`);
    } catch (e3) {
      console.log("Variant 3 Error Status:", e3.response?.status);
      console.log("Variant 3 Error Data:", JSON.stringify(e3.response?.data, null, 2));
    }

    // Variant 4: strategy 1 from tableService: { table_number: 99, is_available: true }
    console.log("\nAttempting Variant 4 (table_number: 99 int, is_available: true):");
    try {
      const post4 = await axios.post(`${baseURL}/restaurant/tables/`, {
        table_number: 99,
        is_available: true
      });
      console.log("Variant 4 SUCCESS:", post4.status, post4.data);
      const createdId = post4.data?.id || post4.data?.data?.id;
      if (createdId) await axios.delete(`${baseURL}/restaurant/tables/${createdId}/`);
    } catch (e4) {
      console.log("Variant 4 Error Status:", e4.response?.status);
      console.log("Variant 4 Error Data:", JSON.stringify(e4.response?.data, null, 2));
    }

  } catch (err) {
    console.error("General error:", err.response ? JSON.stringify(err.response.data) : err.message);
  }
}

testTablesAPI();

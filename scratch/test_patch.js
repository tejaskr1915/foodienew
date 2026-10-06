const http = require('http');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', err => reject(err));
    if (body) req.write(dataString);
    req.end();
  });
}

(async () => {
  try {
    // 1. GET /api/orders/orders/
    const listRes = await makeRequest('GET', '/api/orders/orders/');
    console.log("GET list response status:", listRes.status);
    console.log("GET list body snippet:", listRes.body.substring(0, 500));

    // Try finding order 133 or last order
    const parsed = JSON.parse(listRes.body);
    const orders = parsed.data || parsed.results || parsed || [];
    console.log("Found orders count:", orders.length);
    if (orders.length > 0) {
      const lastOrder = orders[orders.length - 1];
      console.log("Last order details:", lastOrder);

      // Try PATCH on last order status
      const patchRes = await makeRequest('PATCH', `/api/orders/orders/${lastOrder.id}/`, { status: 'PREPARING' });
      console.log("PATCH status response status:", patchRes.status);
      console.log("PATCH status response body:", patchRes.body);
    }
  } catch (e) {
    console.error("Test error:", e);
  }
})();

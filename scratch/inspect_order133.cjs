const http = require('http');

function makeRequest(method, path, body = null) {
  return new Promise((resolve) => {
    const dataString = body ? JSON.stringify(body) : '';
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(dataString);
    req.end();
  });
}

(async () => {
  console.log("Fetching order 133 details...");
  const res133 = await makeRequest('GET', '/api/orders/orders/133/');
  console.log("GET order 133 status:", res133.status);
  console.log("GET order 133 body:", res133.body);

  // Test PATCH status values on 133
  console.log("\nTesting PATCH status='PREPARING'...");
  const patch1 = await makeRequest('PATCH', '/api/orders/orders/133/', { status: 'PREPARING' });
  console.log("PATCH status response:", patch1.status, patch1.body);

  console.log("\nTesting PATCH order_status='PREPARING'...");
  const patch2 = await makeRequest('PATCH', '/api/orders/orders/133/', { order_status: 'PREPARING' });
  console.log("PATCH order_status response:", patch2.status, patch2.body);

  console.log("\nTesting PATCH status='READY'...");
  const patch3 = await makeRequest('PATCH', '/api/orders/orders/133/', { status: 'READY' });
  console.log("PATCH status READY response:", patch3.status, patch3.body);

  // Refetch order 133 to see what field updated
  const refetch = await makeRequest('GET', '/api/orders/orders/133/');
  console.log("\nRefetched order 133 body:", refetch.body);
})();

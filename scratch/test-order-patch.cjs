const http = require('http');

const makeReq = (path, method = 'GET', body = null) => {
  return new Promise((resolve) => {
    const dataStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: '192.168.150.171',
      port: 8000,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(dataStr) } : {})
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(dataStr);
    req.end();
  });
};

(async () => {
  const choices = ['CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'DELIVERED', 'CANCELLED', 'Pending', 'Preparing', 'Ready', 'Serving', 'Completed'];
  for (const c of choices) {
    const res = await makeReq('/orders/orders/154/', 'PATCH', { status: c });
    console.log(`Choice '${c}':`, res.status, res.status === 400 ? JSON.stringify(res.data?.errors) : 'OK');
  }
})();

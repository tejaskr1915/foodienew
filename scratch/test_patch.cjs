const http = require('http');

function testHostPort(host, port, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ host, port, path, status: res.statusCode, body: data.substring(0, 300) }));
    });
    req.on('error', e => resolve({ host, port, path, error: e.message }));
    req.end();
  });
}

(async () => {
  const ports = [2000, 5000, 8000, 3000, 5173];
  for (const p of ports) {
    console.log(await testHostPort('192.168.68.103', p, '/api/orders/orders/'));
    console.log(await testHostPort('127.0.0.1', p, '/api/orders/orders/'));
  }
})();

const http = require('http');

const testEndpoint = (path) => {
  return new Promise((resolve) => {
    const options = {
      hostname: '192.168.150.171',
      port: 8000,
      path: path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ path, status: res.statusCode, data }));
    });
    req.on('error', e => resolve({ path, error: e.message }));
    req.write(JSON.stringify({ email: 'admin@foodie.com', password: '123456' }));
    req.end();
  });
};

(async () => {
  console.log(await testEndpoint('/api/token/'));
  console.log(await testEndpoint('/api/users/token/'));
  console.log(await testEndpoint('/api/auth/login/'));
})();

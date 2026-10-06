const http = require('http');

const options = {
  hostname: '192.168.150.171',
  port: 8000,
  path: '/api/users/login/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Data:', data));
});

req.on('error', e => console.error(e));
req.write(JSON.stringify({ email: 'admin@foodie.com', password: '123456' }));
req.end();

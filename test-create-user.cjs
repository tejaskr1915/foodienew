const http = require('http');

const data = JSON.stringify({
  username: "customer8985506125",
  name: "Customer 6125",
  email: "customer8985506125@foodie.com",
  phone: "+918985506125",
  password: "FoodiePassword123!",
  is_active: true,
  is_phone_verified: true
});

const options = {
  hostname: '192.168.150.171',
  port: 8000,
  path: '/api/users/users/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let resData = '';
  res.on('data', chunk => resData += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Data:', resData));
});
req.write(data);
req.end();

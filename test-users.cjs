const http = require('http');

const options = {
  hostname: '192.168.150.171',
  port: 8000,
  path: '/api/users/users/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Data:', data.substring(0, 1000)));
});
req.end();

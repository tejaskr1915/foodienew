const http = require('http');

const options = {
  hostname: '192.168.150.171',
  port: 8000,
  path: '/api/users/users/',
  method: 'GET',
  headers: {
    'Authorization': 'Basic ' + Buffer.from('teju@gmail.com:123456').toString('base64')
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Data:', data.substring(0, 100)));
});
req.end();

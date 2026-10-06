const http = require('http');
const req = http.request({
  hostname: '192.168.150.171',
  port: 8000,
  path: '/django-admin/login/',
  method: 'GET'
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const csrfMatch = d.match(/name="csrfmiddlewaretoken" value="([^"]+)"/);
    const csrf = csrfMatch ? csrfMatch[1] : null;
    const cookies = res.headers['set-cookie'] || [];
    console.log('CSRF:', csrf, 'Cookies:', cookies);
    
    if (csrf) {
      const postData = 'csrfmiddlewaretoken=' + csrf + '&username=testemp&password=mypassword123&next=/django-admin/';
      const req2 = http.request({
        hostname: '192.168.150.171',
        port: 8000,
        path: '/django-admin/login/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length,
          'Cookie': cookies.map(c => c.split(';')[0]).join('; ')
        }
      }, (res2) => {
        console.log('Login status:', res2.statusCode);
      });
      req2.write(postData);
      req2.end();
    }
  });
});
req.end();

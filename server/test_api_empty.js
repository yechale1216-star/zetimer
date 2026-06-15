const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/students',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'x-school-id': 'a361f199-f54a-4b3a-a351-956a50bb50ef',
    'x-school-name': 'Green Valley Academy'
  }
};

console.log('Making GET request to https://zetimer-ctgw.onrender.com/api/students for empty school...');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('BODY:', body);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();

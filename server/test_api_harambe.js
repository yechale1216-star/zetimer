const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/students',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'x-school-id': 'test-school-1',
    'x-school-name': 'Harambe Primary School'
  }
};

console.log('Making GET request to http://localhost:5000/api/students for test-school-1...');

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

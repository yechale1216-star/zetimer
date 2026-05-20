const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/students',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'x-school-id': '97be298d-4ca5-4e2a-b227-54a10bf8e27e', // Valid ID from test_students.js
    'x-school-name': 'Zetime School'
  }
};

console.log('Making GET request to http://localhost:5000/api/students...');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('BODY:', body);
    try {
        const json = JSON.parse(body);
        console.log('Parsed JSON Success:', json.success);
    } catch (e) {
        console.log('Failed to parse JSON body');
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();

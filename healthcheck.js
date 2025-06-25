// healthcheck.js - Place this in your project root
import { createServer } from 'http';

const options = {
  host: 'localhost',
  port: 3000,
  timeout: 2000,
  path: '/'
};

const request = createServer().request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', function(err) {
  console.log('ERROR');
  process.exit(1);
});

request.end();
const jwt = require('jsonwebtoken');

// Generate a test token
const token = jwt.sign(
  { id: 'adaa268f-1e14-4d20-b2f1-23060155167f', username: 'aegysinai' },
  'bitglow-secret-key-change-me'
);

console.log('Test token:', token);
console.log('\nUse this in your API test:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3003/api/posts/feed`);
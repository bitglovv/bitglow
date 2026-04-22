const fs = require('fs');
let t = fs.readFileSync('src/services/api.ts', 'utf8');
t = t.replace(
    '| { type: "follow_request"; user: User; createdAt: string };',
    '| { type: "follow_request"; user: User; createdAt: string }\n    | { type: "follow"; user: User; createdAt: string }\n    | { type: "follow_back"; user: User; createdAt: string }\n    | { type: "dm"; user: User; content: string; createdAt: string };'
);
fs.writeFileSync('src/services/api.ts', t);
console.log('done');

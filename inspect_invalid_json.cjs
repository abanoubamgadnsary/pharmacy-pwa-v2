const fs = require('fs');
const raw = fs.readFileSync('eg_drugs.json', 'utf8');
const pos = 621499;
const start = Math.max(0, pos - 120);
const end = Math.min(raw.length, pos + 120);
const chunk = raw.slice(start, end);
console.log('chunk start', start, 'end', end);
console.log(chunk.replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/\t/g,'\\t'));
console.log('pos char code', raw.charCodeAt(pos));

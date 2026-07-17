const fs = require('fs');
const text = fs.readFileSync('eg_drugs.json', 'utf8');
let i = 0;
const n = text.length;
const skipWhitespace = () => { while (i < n && /[\s\n\r\t]/.test(text[i])) i++; };
const cleanObject = (raw) => {
  let out = '';
  let inString = false;
  let escape = false;
  for (let j = 0; j < raw.length; j++) {
    const ch = raw[j];
    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      continue;
    }
    if (escape) {
      out += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escape = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inString = false;
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code >= 0 && code <= 0x1f) {
      if (ch === '\t') out += '\\t';
      else if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else out += `\\u${code.toString(16).padStart(4,'0')}`;
    } else {
      out += ch;
    }
  }
  return out;
};
const objs = [];
if (text[i] !== '[') throw new Error('expected ['); i++;
while (true) {
  skipWhitespace();
  if (i >= n) break;
  if (text[i] === ']') break;
  if (text[i] === ',') { i++; continue; }
  if (text[i] !== '{') throw new Error('expected { at ' + i);
  let brace = 0;
  let inString = false;
  let escape = false;
  let start = i;
  for (; i < n; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '{') brace++;
      else if (ch === '}') {
        brace--;
        if (brace === 0) { i++; break; }
      }
    }
  }
  const raw = text.slice(start, i);
  const cleaned = cleanObject(raw);
  try {
    const obj = JSON.parse(cleaned);
    objs.push(obj);
  } catch (err) {
    console.error('parse failed at object', objs.length, err.message);
    console.error(cleaned.slice(0,400));
    break;
  }
  if (objs.length >= 50) break;
}
console.log('parsed objects', objs.length);
const keys = new Set();
objs.forEach(o => Object.keys(o).forEach(k => keys.add(k)));
console.log('keys', [...keys].sort());
console.log('sample first object keys', Object.keys(objs[0]).slice(0,30));
console.log('sample object', JSON.stringify(objs[0], null, 2).slice(0,600));

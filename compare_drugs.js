const fs = require('fs');
const files = {
  karem: 'egyptian-drugs.json',
  mahmoud: 'eg_drugs.json'
};
const datasets = {};
for (const [name, file] of Object.entries(files)) {
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  const keys = new Set();
  data.forEach(item => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      Object.keys(item).forEach(k => keys.add(k));
    }
  });
  datasets[name] = { data, keys };
  console.log('===', name);
  console.log('type', Array.isArray(data) ? 'array' : typeof data, 'count', Array.isArray(data) ? data.length : 'n/a');
  console.log('unique keys count', keys.size);
  console.log('keys', [...keys].sort().join(', '));
  console.log('first item sample keys', Object.keys(data[0]).slice(0,40).join(', '));
  console.log('first item sample (first 15 fields):');
  Object.entries(data[0]).slice(0,15).forEach(([k,v]) => console.log(' ', k, typeof v, JSON.stringify(v).slice(0,120)));
  console.log();
}
const kKeys = datasets.karem.keys;
const mKeys = datasets.mahmoud.keys;
const onlyK = [...kKeys].filter(k => !mKeys.has(k)).sort();
const onlyM = [...mKeys].filter(k => !kKeys.has(k)).sort();
const common = [...kKeys].filter(k => mKeys.has(k)).sort();
console.log('common keys count', common.length);
console.log('only in karem', onlyK.length, onlyK.slice(0,100).join(', '));
console.log('only in mahmoud', onlyM.length, onlyM.slice(0,100).join(', '));

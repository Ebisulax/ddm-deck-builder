const fs = require('fs');
function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['"_#]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const text = fs.readFileSync('filelist.txt').toString('utf16le').replace(/^\uFEFF/, '');
const nameToId = new Map();
for (const line of text.split(/\r?\n/)) {
  const match = line.match(/^\s*(\d{4})\s*-\s*(.+?)\s*$/i);
  if (!match) continue;
  nameToId.set(normalizeName(match[2]), String(match[1]));
}
for (const name of ['Ancient Lamp', 'the immortal bushi', 'Blue-Eyes White Dragon', '13th Grave']) {
  const key = normalizeName(name);
  console.log(name, '=>', key, '=>', nameToId.get(key));
}
console.log('has ancient lamp?', nameToId.has(normalizeName('Ancient Lamp')));
console.log('has immortal bushi?', nameToId.has(normalizeName('the immortal bushi')));

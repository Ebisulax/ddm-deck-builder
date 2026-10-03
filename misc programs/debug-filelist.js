const fs = require('fs');

const raw = fs.readFileSync('filelist.txt');
const text = raw.toString('utf16le').replace(/^\uFEFF/, '');
console.log('text preview:\n' + text.split(/\r?\n/).slice(0, 12).join('\n'));

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[\'"_#]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const map = new Map();
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^\s*(\d{4})\s*-\s*(.+?)\s*$/i);
  if (!m) continue;
  map.set(normalize(m[2]), m[1]);
}
console.log('map size', map.size);
console.log('match 13th grave?', map.get(normalize('13th Grave')));
console.log('match blue eyes white dragon?', map.get(normalize('Blue-Eyes White Dragon')));
console.log('match dark magician?', map.get(normalize('Dark Magician')));

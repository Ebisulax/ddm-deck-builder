const fs = require('fs');
const path = require('path');

const root = __dirname;
const cardsPath = path.join(root, 'cards.json');
const fileListPath = path.join(root, 'filelist.txt');

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

const cardData = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

const aliasMap = new Map([
  [normalizeName('Ash Blossom & Joyous Springs'), normalizeName('ash blossom')],
  [normalizeName('La Jinn the Mystical Genie of the Lamp'), normalizeName('la jinn the genie of the mystic lamp')],
  [normalizeName('Doma, Angel of Silence'), normalizeName('doma the angel of silence')]
]);

const fileText = fs.readFileSync(fileListPath).toString('utf16le').replace(/^\uFEFF/, '');
const nameToId = new Map();

for (const line of fileText.split(/\r?\n/)) {
  const match = line.match(/^\s*(\d{4})\s*-\s*(.+?)\s*$/i);
  if (!match) continue;
  const normalized = normalizeName(match[2]);
  if (!normalized) continue;
  nameToId.set(normalized, String(match[1]));
}

let updated = 0;
const unmatched = [];

for (const card of cardData.cards) {
  const key = normalizeName(card.name);
  const aliasKey = aliasMap.get(key);
  const id = nameToId.get(key) || (aliasKey ? nameToId.get(aliasKey) : undefined);
  if (id) {
    card.id = id;
    updated += 1;
  } else {
    unmatched.push(card.name);
  }
}

cardData.cards.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
if (cardData.meta) {
  cardData.meta.cardCount = cardData.cards.length;
}

fs.writeFileSync(cardsPath, JSON.stringify(cardData, null, 2) + '\n', 'utf8');

console.log(`Updated ${updated} cards from file names.`);
console.log(`Unmatched: ${unmatched.length}`);
if (unmatched.length > 0) {
  console.log(unmatched.slice(0, 20).join('\n'));
}
console.log('First entries:');
for (const card of cardData.cards.slice(0, 10)) {
  console.log(`${card.id} - ${card.name}`);
}

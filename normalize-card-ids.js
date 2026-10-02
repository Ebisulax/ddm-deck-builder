const fs = require('fs');

const path = 'cards.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

for (const card of data.cards) {
  card.id = Number(card.id);
}

data.cards.sort((a, b) => a.id - b.id);
data.meta = data.meta || {};
data.meta.cardCount = data.cards.length;

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ count: data.cards.length, first: data.cards[0].id, type: typeof data.cards[0].id }));

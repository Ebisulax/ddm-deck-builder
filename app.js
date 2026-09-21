
const DECK_SIZE = 15;
const MAX_COPIES = 3;
const STORAGE_KEY = "ddm-deck-builder-deck";

let cards = [];
let deck = loadDeck();

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  collectElements();
  attachEvents();

  try {
    const response = await fetch("cards.json");
    if (!response.ok) throw new Error(`Could not load cards.json (${response.status})`);
    cards = await response.json();

    populateFilterOptions();
    renderAll();
  } catch (error) {
    document.getElementById("results").innerHTML = `
      <div class="error">
        <strong>Could not load cards.json.</strong><br><br>
        Run this folder through a small local web server (for example VS Code Live Server)
        instead of double-clicking index.html.<br><br>
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}

function collectElements() {
  [
    "searchText", "effectText", "categoryFilter", "levelFilter",
    "monsterTypeFilter", "itemTypeFilter", "itemSubtypeFilter",
    "keywordFilter", "crestFilter", "crestRollFilter", "crestAmountFilter",
    "hpOperator", "hpValue", "atkOperator", "atkValue",
    "defOperator", "defValue", "sortBy", "clearFiltersBtn",
    "resultCount", "results", "deckCount", "deckStatus", "deckList",
    "summaryCards", "summaryUnique", "exportDeckBtn", "importDeckBtn",
    "clearDeckBtn", "importDeckInput"
  ].forEach(id => els[id] = document.getElementById(id));
}

function attachEvents() {
  const filterIds = [
    "searchText", "effectText", "categoryFilter", "levelFilter",
    "monsterTypeFilter", "itemTypeFilter", "itemSubtypeFilter",
    "keywordFilter", "crestFilter", "crestRollFilter", "crestAmountFilter",
    "hpOperator", "hpValue", "atkOperator", "atkValue",
    "defOperator", "defValue", "sortBy"
  ];

  filterIds.forEach(id => {
    document.getElementById(id).addEventListener("input", renderCards);
    document.getElementById(id).addEventListener("change", renderCards);
  });

  els.clearFiltersBtn.addEventListener("click", clearFilters);
  els.exportDeckBtn.addEventListener("click", exportDeck);
  els.importDeckBtn.addEventListener("click", () => els.importDeckInput.click());
  els.importDeckInput.addEventListener("change", importDeck);
  els.clearDeckBtn.addEventListener("click", clearDeck);
}

function populateFilterOptions() {
  fillSelect("categoryFilter", unique(cards.map(c => c.category)));
  fillSelect("levelFilter", unique(cards.map(c => c.level)).sort((a,b) => a-b));
  fillSelect("monsterTypeFilter", unique(cards.map(c => c.monsterType)));
  fillSelect("itemTypeFilter", unique(cards.map(c => c.itemType)));
  fillSelect("itemSubtypeFilter", unique(cards.map(c => c.itemSubtype)));

  const keywords = cards.flatMap(c => (c.keywords || []).map(k => k.name));
  fillSelect("keywordFilter", unique(keywords));

  const crests = cards.flatMap(c => getDieFaces(c).map(face => face.crest));
  fillSelect("crestFilter", unique(crests));
}

function fillSelect(id, values) {
  const select = document.getElementById(id);
  values.filter(v => v !== undefined && v !== null && v !== "").forEach(value => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = titleCase(String(value));
    select.appendChild(option);
  });
}

function unique(values) {
  return [...new Set(values)];
}

function getDieFaces(card) {
  const level = Number(card.level);
  const faces = [];

  // Universal level rule:
  // Level 1 -> rolls 1-4 are Star 1
  // Level 2 -> rolls 1-3 are Star 2
  // Level 3 -> rolls 1-2 are Star 3
  // Level 4 -> roll 1 is Star 4
  const starFaceCount = Math.max(0, 5 - level);

  for (let roll = 1; roll <= starFaceCount; roll++) {
    faces.push({ roll, crest: "star", amount: level });
  }

  for (const crest of (card.crests || [])) {
    faces.push(crest);
  }

  return faces.sort((a, b) => a.roll - b.roll);
}

function filteredCards() {
  const query = els.searchText.value.trim().toLowerCase();
  const effectQuery = els.effectText.value.trim().toLowerCase();

  const filtered = cards.filter(card => {
    const fullText = [
      card.name,
      card.category,
      card.monsterType,
      card.itemType,
      card.itemSubtype,
      card.effect,
      ...(card.keywords || []).map(k => `${k.name} ${k.value ?? ""}`),
      ...getDieFaces(card).map(c => `${c.crest} ${c.amount}`)
    ].filter(Boolean).join(" ").toLowerCase();

    if (query && !fullText.includes(query)) return false;
    if (effectQuery && !(card.effect || "").toLowerCase().includes(effectQuery)) return false;

    if (els.categoryFilter.value && String(card.category) !== els.categoryFilter.value) return false;
    if (els.levelFilter.value && String(card.level) !== els.levelFilter.value) return false;
    if (els.monsterTypeFilter.value && String(card.monsterType || "") !== els.monsterTypeFilter.value) return false;
    if (els.itemTypeFilter.value && String(card.itemType || "") !== els.itemTypeFilter.value) return false;
    if (els.itemSubtypeFilter.value && String(card.itemSubtype || "") !== els.itemSubtypeFilter.value) return false;

    if (els.keywordFilter.value) {
      const hasKeyword = (card.keywords || []).some(k => k.name === els.keywordFilter.value);
      if (!hasKeyword) return false;
    }

    const crest = els.crestFilter.value;
    const roll = els.crestRollFilter.value ? Number(els.crestRollFilter.value) : null;
    const minAmount = els.crestAmountFilter.value ? Number(els.crestAmountFilter.value) : null;

    if (crest || roll || minAmount !== null) {
      const match = getDieFaces(card).some(face => {
        if (crest && face.crest !== crest) return false;
        if (roll && face.roll !== roll) return false;
        if (minAmount !== null && Number(face.amount) < minAmount) return false;
        return true;
      });
      if (!match) return false;
    }

    if (!matchesNumeric(card.hp, els.hpOperator.value, els.hpValue.value)) return false;
    if (!matchesNumeric(card.atk, els.atkOperator.value, els.atkValue.value)) return false;
    if (!matchesNumeric(card.def, els.defOperator.value, els.defValue.value)) return false;

    return true;
  });

  return sortCards(filtered, els.sortBy.value);
}

function matchesNumeric(actual, operator, rawTarget) {
  if (rawTarget === "") return true;
  if (actual === undefined || actual === null || actual === "") return false;

  const a = Number(actual);
  const b = Number(rawTarget);

  switch (operator) {
    case "<": return a < b;
    case "<=": return a <= b;
    case "=": return a === b;
    case ">=": return a >= b;
    case ">": return a > b;
    default: return true;
  }
}

function sortCards(list, mode) {
  const sorted = [...list];

  const n = (value, fallback) =>
    value === undefined || value === null ? fallback : Number(value);

  switch (mode) {
    case "name-desc": return sorted.sort((a,b) => b.name.localeCompare(a.name));
    case "level-asc": return sorted.sort((a,b) => n(a.level, 999)-n(b.level, 999) || a.name.localeCompare(b.name));
    case "level-desc": return sorted.sort((a,b) => n(b.level,-1)-n(a.level,-1) || a.name.localeCompare(b.name));
    case "atk-asc": return sorted.sort((a,b) => n(a.atk,9999)-n(b.atk,9999) || a.name.localeCompare(b.name));
    case "atk-desc": return sorted.sort((a,b) => n(b.atk,-1)-n(a.atk,-1) || a.name.localeCompare(b.name));
    case "def-asc": return sorted.sort((a,b) => n(a.def,9999)-n(b.def,9999) || a.name.localeCompare(b.name));
    case "def-desc": return sorted.sort((a,b) => n(b.def,-1)-n(a.def,-1) || a.name.localeCompare(b.name));
    case "hp-asc": return sorted.sort((a,b) => n(a.hp,9999)-n(b.hp,9999) || a.name.localeCompare(b.name));
    case "hp-desc": return sorted.sort((a,b) => n(b.hp,-1)-n(a.hp,-1) || a.name.localeCompare(b.name));
    default: return sorted.sort((a,b) => a.name.localeCompare(b.name));
  }
}

function renderAll() {
  renderCards();
  renderDeck();
}

function renderCards() {
  const list = filteredCards();
  els.resultCount.textContent = `${list.length} card${list.length === 1 ? "" : "s"}`;
  els.results.innerHTML = "";

  if (!list.length) {
    els.results.innerHTML = `<div class="no-results surface">No cards match these filters.</div>`;
    return;
  }

  for (const card of list) {
    const template = document.getElementById("cardTemplate");
    const fragment = template.content.cloneNode(true);

    const image = fragment.querySelector(".card-image");
    const flipBtn = fragment.querySelector(".flip-btn");
    image.src = card.imageFront || "";
    image.alt = `${card.name} front`;

    let showingBack = false;
    flipBtn.disabled = !card.imageBack;
    flipBtn.addEventListener("click", () => {
      showingBack = !showingBack;
      image.src = showingBack ? card.imageBack : card.imageFront;
      image.alt = `${card.name} ${showingBack ? "back" : "front"}`;
      flipBtn.textContent = showingBack ? "Show front" : "Show back";
    });

    fragment.querySelector(".card-name").textContent = card.name;

    const meta = fragment.querySelector(".card-meta");
    addBadge(meta, `Level ${card.level}`);
    addBadge(meta, titleCase(card.category || ""));
    if (card.monsterType) addBadge(meta, card.monsterType);
    if (card.itemType) addBadge(meta, card.itemType);
    if (card.itemSubtype) addBadge(meta, card.itemSubtype);

    const stats = fragment.querySelector(".stats");
    if (card.hp !== undefined) addStat(stats, "HP", card.hp);
    if (card.atk !== undefined) addStat(stats, "ATK", card.atk);
    if (card.def !== undefined) addStat(stats, "DEF", card.def);

    fragment.querySelector(".effect").textContent = card.effect || "No effect text.";

    const keywordBlock = fragment.querySelector(".keywords-block");
    const keywords = fragment.querySelector(".keywords");
    if (!(card.keywords || []).length) {
      keywordBlock.style.display = "none";
    } else {
      for (const keyword of card.keywords) {
        addBadge(keywords, keyword.value === undefined ? keyword.name : `${keyword.name} ${keyword.value}`);
      }
    }

    const diceList = fragment.querySelector(".dice-list");
    for (const face of getDieFaces(card)) {
      const el = document.createElement("span");
      el.className = "die";
      el.textContent = `${face.roll}: ${crestSymbol(face.crest)} ${titleCase(face.crest)} ×${face.amount}`;
      diceList.appendChild(el);
    }

    const count = deck[card.id] || 0;
    const copyCount = fragment.querySelector(".copy-count");
    copyCount.textContent = count ? `${count}/${MAX_COPIES} in deck` : "";

    const addBtn = fragment.querySelector(".add-btn");
    addBtn.disabled = count >= MAX_COPIES || deckTotal() >= DECK_SIZE;
    addBtn.textContent =
      count >= MAX_COPIES ? "Max 3" :
      deckTotal() >= DECK_SIZE ? "Deck full" :
      "Add to deck";
    addBtn.addEventListener("click", () => addCard(card.id));

    els.results.appendChild(fragment);
  }
}

function addBadge(parent, text) {
  const el = document.createElement("span");
  el.className = "badge";
  el.textContent = text;
  parent.appendChild(el);
}

function addStat(parent, label, value) {
  const el = document.createElement("span");
  el.className = "stat";
  el.innerHTML = `<strong>${escapeHtml(label)}</strong> ${escapeHtml(String(value))}`;
  parent.appendChild(el);
}

function crestSymbol(crest) {
  const symbols = {
    star: "★",
    movement: "➜",
    magic: "⚡",
    attack: "⚔",
    defense: "◆",
    trap: "▣"
  };
  return symbols[crest] || "•";
}

function addCard(cardId) {
  const current = deck[cardId] || 0;
  if (current >= MAX_COPIES) return;
  if (deckTotal() >= DECK_SIZE) return;

  deck[cardId] = current + 1;
  saveDeck();
  renderAll();
}

function removeCard(cardId) {
  if (!deck[cardId]) return;
  deck[cardId] -= 1;
  if (deck[cardId] <= 0) delete deck[cardId];
  saveDeck();
  renderAll();
}

function renderDeck() {
  const total = deckTotal();
  const uniqueCount = Object.keys(deck).filter(id => deck[id] > 0).length;

  els.deckCount.textContent = total;
  els.summaryCards.textContent = `${total} / ${DECK_SIZE}`;
  els.summaryUnique.textContent = uniqueCount;

  const valid = total === DECK_SIZE && Object.values(deck).every(qty => qty <= MAX_COPIES);
  els.deckStatus.textContent = valid
    ? "Valid 15-card deck"
    : total < DECK_SIZE
      ? `${DECK_SIZE - total} card${DECK_SIZE - total === 1 ? "" : "s"} needed`
      : "Deck invalid";

  els.deckStatus.className = `deck-status ${valid ? "valid" : "invalid"}`;
  els.deckList.innerHTML = "";

  const entries = Object.entries(deck)
    .filter(([,qty]) => qty > 0)
    .map(([id, qty]) => ({ card: cards.find(c => c.id === id), qty }))
    .filter(x => x.card)
    .sort((a,b) => a.card.name.localeCompare(b.card.name));

  if (!entries.length) {
    els.deckList.innerHTML = `<div class="deck-empty">Add cards from the search results.</div>`;
    return;
  }

  for (const {card, qty} of entries) {
    const row = document.createElement("div");
    row.className = "deck-entry";

    const info = document.createElement("div");
    info.innerHTML = `
      <div class="deck-entry-title">${escapeHtml(card.name)}</div>
      <div class="deck-entry-meta">Level ${escapeHtml(String(card.level))} · ${escapeHtml(titleCase(card.category || ""))}</div>
    `;

    const controls = document.createElement("div");
    controls.className = "quantity-controls";

    const minus = document.createElement("button");
    minus.className = "secondary";
    minus.textContent = "−";
    minus.title = "Remove one";
    minus.addEventListener("click", () => removeCard(card.id));

    const quantity = document.createElement("span");
    quantity.className = "quantity";
    quantity.textContent = qty;

    const plus = document.createElement("button");
    plus.textContent = "+";
    plus.title = "Add one";
    plus.disabled = qty >= MAX_COPIES || total >= DECK_SIZE;
    plus.addEventListener("click", () => addCard(card.id));

    controls.append(minus, quantity, plus);
    row.append(info, controls);
    els.deckList.appendChild(row);
  }
}

function deckTotal() {
  return Object.values(deck).reduce((sum, qty) => sum + Number(qty || 0), 0);
}

function saveDeck() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
}

function loadDeck() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const clean = {};

    for (const [id, rawQty] of Object.entries(parsed)) {
      const qty = Math.max(0, Math.min(MAX_COPIES, Number(rawQty) || 0));
      if (qty > 0) clean[id] = qty;
    }
    return clean;
  } catch {
    return {};
  }
}

function clearDeck() {
  if (!Object.keys(deck).length) return;
  if (!confirm("Clear the whole deck?")) return;
  deck = {};
  saveDeck();
  renderAll();
}

function exportDeck() {
  const payload = {
    format: "ddm-deck-v1",
    size: deckTotal(),
    cards: Object.entries(deck)
      .filter(([,qty]) => qty > 0)
      .map(([id, amount]) => ({ id, amount }))
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ddm-deck.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importDeck(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.cards;

    if (!Array.isArray(list)) throw new Error("Deck JSON does not contain a cards array.");

    const nextDeck = {};
    let total = 0;

    for (const entry of list) {
      const id = entry.id;
      const amount = Number(entry.amount ?? entry.quantity ?? 1);

      if (!cards.some(c => c.id === id)) continue;
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const allowedForCard = Math.min(MAX_COPIES, Math.floor(amount));
      const allowedForDeck = Math.min(allowedForCard, DECK_SIZE - total);

      if (allowedForDeck > 0) {
        nextDeck[id] = allowedForDeck;
        total += allowedForDeck;
      }

      if (total >= DECK_SIZE) break;
    }

    deck = nextDeck;
    saveDeck();
    renderAll();
  } catch (error) {
    alert(`Could not import deck: ${error.message}`);
  }
}

function clearFilters() {
  [
    "searchText", "effectText", "categoryFilter", "levelFilter",
    "monsterTypeFilter", "itemTypeFilter", "itemSubtypeFilter",
    "keywordFilter", "crestFilter", "crestRollFilter", "crestAmountFilter",
    "hpValue", "atkValue", "defValue"
  ].forEach(id => document.getElementById(id).value = "");

  els.hpOperator.value = "<";
  els.atkOperator.value = "<";
  els.defOperator.value = "<";
  els.sortBy.value = "name-asc";
  renderCards();
}

function titleCase(value) {
  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

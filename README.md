# DDM Card Search & Deck Builder

A very small vanilla HTML/CSS/JavaScript project.

## Current deck rules

- Deck size: exactly **15 cards**
- Maximum copies of one card: **3**
- Deck is stored automatically in your browser with `localStorage`
- Decks can also be exported/imported as JSON

## Card database

Cards are stored in `cards.json`.

Example:

```json
{
  "id": "nimble-momonga",
  "name": "Nimble Momonga",
  "category": "monster",
  "level": 1,
  "monsterType": "Beast",
  "hp": 20,
  "atk": 10,
  "def": 20,
  "effect": "Dimension: Add 1 movement crest to your crest pool. Your Level 1 and Level 2 Beasts have Swift 2.",
  "keywords": [
    { "name": "Swift", "value": 2 }
  ],
  "crests": [
    { "roll": 5, "crest": "magic", "amount": 3 },
    { "roll": 6, "crest": "movement", "amount": 3 }
  ],
  "imageFront": "assets/cards/nimble-momonga-front.jpg",
  "imageBack": "assets/cards/nimble-momonga-back.jpg"
}
```

### Automatic star faces

You do not need to enter the Star/Dimension faces in every card.

The page automatically derives them from `level`:

- Level 1: rolls 1–4 = Star ×1
- Level 2: rolls 1–3 = Star ×2
- Level 3: rolls 1–2 = Star ×3
- Level 4: roll 1 = Star ×4

Only enter the other dice faces in `crests`.

## Item example

```json
{
  "id": "example-item",
  "name": "Example Item",
  "category": "item",
  "level": 2,
  "itemType": "Trap",
  "itemSubtype": "Continuous",
  "effect": "Effect text here.",
  "keywords": [],
  "crests": [
    { "roll": 4, "crest": "movement", "amount": 2 },
    { "roll": 5, "crest": "magic", "amount": 2 },
    { "roll": 6, "crest": "trap", "amount": 1 }
  ],
  "imageFront": "assets/cards/example-item-front.jpg",
  "imageBack": "assets/cards/example-item-back.jpg"
}
```

Other item subtype examples can be represented as:

```json
"itemType": "Trap",
"itemSubtype": "DM-Trap"
```

or

```json
"itemType": "Spell",
"itemSubtype": "Continuous"
```

## Run it in VS Code

Because the page loads `cards.json`, run it through a local web server instead of opening `index.html` directly.

The easiest option:

1. Open the project folder in VS Code.
2. Install the **Live Server** VS Code extension if you do not already have it.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

## Create a new Git repository in VS Code

1. Open this folder in VS Code.
2. Click the **Source Control** icon in the left sidebar.
3. Click **Initialize Repository**.
4. Stage the files.
5. Enter a commit message, for example `Initial DDM deck builder`.
6. Click **Commit**.

If you want it on GitHub afterward:

1. In Source Control, choose **Publish Branch** / **Publish to GitHub**.
2. Pick public or private.
3. VS Code will create the GitHub repository and push the project.

You can also do it from the VS Code terminal:

```bash
git init
git add .
git commit -m "Initial DDM deck builder"
```

## Filters currently included

- free text search
- effect text search
- category
- level
- monster type
- item type
- item subtype
- keyword
- crest
- die roll
- minimum crest amount
- HP `< <= = >= >`
- ATK `< <= = >= >`
- DEF `< <= = >= >`
- sorting by name, level, HP, ATK and DEF

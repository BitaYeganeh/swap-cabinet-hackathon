# The Swap Cabinet: Smart Search for a secondhand clothing marketplace

Team 4's project for the Tieto Bootcamp Sharetribe hackathon (October 2026).

We built a smarter search layer on top of a real Sharetribe secondhand clothing
marketplace. A buyer describes what they want in their own words, or shows a
photo. The search finds the right listings, even with typos, synonyms, Finnish
words or a vague need.

## What it does

| Feature | Example | What happens |
|---|---|---|
| **AI search** | "cheap black sneakers size 38 women" | Claude turns the sentence into the marketplace's own filters (category, colour, size, price). |
| **Need-based search** | "something to keep me dry in the rain" | Claude picks the listings in stock that meet the need, and gives a short reason for each one. |
| **Photo search** | Upload or drag in a photo of a jacket | Claude reads what the item is (kind, brand, material). A local CLIP model reads how it looks. Results come in groups: same product, exact matches, similar items. |
| **Typo-proof keyword search** | "jakcet", "farkut" (Finnish for jeans) | Finds the right listings. The built-in Sharetribe search finds 0. |
| **Autocomplete** | Type "jack" | Shows suggestions while you type. No AI cost. |
| **Never empty** | Filters that match nothing | Drops the least important filter and tells the buyer which one it dropped. |

Sold or closed listings are never shown as available.

## Results

We tested 11 searches against the live marketplace. We picked the right answers
by hand. The full report is in [`server/scripts/evalReport.md`](server/scripts/evalReport.md).

| Search | Found all right items | Shown items are right | Right items on first page |
|---|---|---|---|
| Before: Sharetribe keyword search | 84% | 27% | 67% |
| Our smart keyword search (no AI) | 91% | 39% | 88% |
| Our AI search | 90% | 54% | 88% |

For vague needs ("what to wear to a wedding"), our AI search found **100%** of
the right items. The built-in search found 76%. An AI search costs about $0.015.

## How it works

```
Buyer types or uploads a photo
        │
        ▼
Search server (Node + Express)
  ├─ Claude: understands the sentence or the photo
  ├─ Vector store (LanceDB): finds listings by meaning and by look
  │     ├─ CLIP model: compares photos
  │     └─ Multilingual text model: compares meaning (English and Finnish)
  └─ Fuzzy search: fixes typos and synonyms
        │
        ▼
Real listings from the Sharetribe Marketplace API ──► link to the listing page
```

- **Source of truth:** the real Sharetribe marketplace, read through the Sharetribe SDK.
- **Local index:** a sync script copies every listing into a local vector store
  (`server/data/`). Claude labels each listing once. Later syncs only handle new
  or changed listings, and remove sold ones.
- **Cost guard:** AI search stops for the day after a set budget (default $5),
  with a limit per visitor per minute.

## What is in this repo

| Folder | What it is |
|---|---|
| [`server/`](server) | Our search server (Express, Sharetribe SDK, Claude, LanceDB). Also serves the built client. |
| [`client/`](client) | Our own shop website (React, Vite, Tailwind), "The Swap Cabinet". |
| [`web-template/`](web-template) | The official Sharetribe Web Template with our Smart Search module built in. See [its README](web-template/server/api/smart-search/README.md). |
| [`mobile-app/`](mobile-app) | A small Expo app that opens the marketplace on a phone. |
| [`docs/`](docs) | Design notes and plans. |
| [`start-demo.sh`](start-demo.sh) | Starts the full demo with one command. |

## How to use it

### What you need

- Node.js 22 or newer, and npm
- About 1 GB of free disk space (AI models and packages)
- Two keys (ask the team; never commit them):
  - `SHARETRIBE_CLIENT_ID`: reads the marketplace listings
  - `ANTHROPIC_API_KEY`: AI search and photo labels (Claude)

### Quick start (our search server and website)

1. Get the code.

   ```bash
   git clone https://github.com/Z4Tauhid/Hackathon_team4.git
   cd Hackathon_team4
   ```

2. Set up the server and add your keys.

   ```bash
   cd server
   npm install
   cp .env.example .env
   ```

   Open `server/.env` and fill in `SHARETRIBE_CLIENT_ID` and `ANTHROPIC_API_KEY`.

3. Fill the search index (one time, about 2 minutes, about $1 of Claude calls).

   ```bash
   npm run sync
   ```

4. Start the server.

   ```bash
   npm run dev
   ```

5. In a second terminal, start the website.

   ```bash
   cd client
   npm install
   npm run dev
   ```

6. Open http://localhost:5173 and search.

The full guide, with all settings and common problems, is in [`SETUP.md`](SETUP.md).

### Try these searches

| Type this | Why it is interesting |
|---|---|
| `jakcet` | Typo. The built-in search finds nothing. |
| `farkut` | Finnish word for jeans. |
| `something to keep me dry in the rain` | A need, not a product name. |
| `what to wear to a wedding` | A vague need. |
| Camera button → a photo of a shoe | Photo search. |

### Full demo (Web Template, our website and the phone app)

On a Mac on Wi-Fi, from the repo folder:

```bash
bash start-demo.sh
```

This starts:

- the Sharetribe Web Template with Smart Search on port `4000`
- our website and search server on port `3000`
- the Expo app server. Scan the QR code with the Expo Go app on a phone on the same Wi-Fi.

The Web Template needs its own `web-template/.env`. Copy it from
`web-template/.env-template` and fill in the Sharetribe keys and `ANTHROPIC_API_KEY`.

### Run the tests

```bash
cd server
npm test
```

## Security

- Keys live only in `.env` files. All `.env` files are in `.gitignore`.
- The Claude key and the Sharetribe secret stay on the server. The browser never sees them.
- The local search index (`server/data/`) is not committed. Rebuild it with `npm run sync`.

## Team

Team 4: Farouq, Tauhid, Nisha and Bita.

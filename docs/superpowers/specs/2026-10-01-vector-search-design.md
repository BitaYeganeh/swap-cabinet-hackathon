# Shared vector store: photo search and smarter AI search

Date: 2026-10-01. Owner: Farouq. Branch: `farouq`.

## Goal

1. **Photo search.** A buyer sees an item somewhere, takes or uploads a photo, and gets matching
   listings in four ranked groups.
2. **Better AI search.** Upgrade the existing natural-language search (`aiSearchService.js`) to use
   meaning-based matching from the same store.

Both features read from one local vector store, filled by one sync script from the real
Sharetribe data.

## Rules that do not change

- Never lose a listing the current search would find (accuracy rule in `CLAUDE.md`).
- Seller-entered fields win over AI labels. AI labels only fill gaps. Nothing is written back to Sharetribe.
- Credentials stay in `server/.env`. The store files are not committed.

## Part 1: the store and the sync

### Folder `server/src/vectorStore/`

| File | One job |
|---|---|
| `vocabulary.js` | Fixed label lists (groups, kinds, styles, materials, patterns). |
| `labels.js` | Claude reads a listing (text, fields, photo) or a buyer photo and returns labels from the fixed lists. |
| `embed.js` | Photo vectors and CLIP text vectors (CLIP), text vectors (multilingual text model). |
| `store.js` | Read and write the LanceDB table. |
| `sync.js` | Script: fetch all listings, label, embed, store. |
| `rank.js` | Put listings in the four groups and order them. |

### Tools

- **LanceDB** (`@lancedb/lancedb`): embedded vector database, stored as files in `server/data/lancedb/` (git-ignored). No extra server.
- **CLIP** (`Xenova/clip-vit-base-patch32` through `@huggingface/transformers`): runs locally, free. Image and text vectors share one space.
- **Text model** (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`): runs locally, free, handles Finnish. Chosen over `multilingual-e5-small` after a test: clearer score gaps between related and unrelated listings.
- **Claude** (`@anthropic-ai/sdk`, already in the server, same `ANTHROPIC_API_KEY`): labels, with structured output (zod), like the AI search does.

### Table `listings`, one row per listing

- `id`, `title`, `listingType` (for sale or "wanted"), `contentHash`
- `items`: list of items (a bundle has several). Each item: `group`, `kind`, `brand`, `model`,
  `style`, `material`, `pattern`, `details`, `color`.
- `photoVector`: CLIP vector of the first photo. Null when the listing has no photo.
- `clipTextVector`: CLIP vector of the listing text (for listings without a photo).
- `textVector`: text-model vector of title, description and labels.

### Labels

- Groups: tops, outerwear, dresses, bottoms, shoes, bags, accessories.
- Kinds: a fixed list per group (for example shoes: hi-top sneaker, low sneaker, boot, ankle boot,
  sandal, flip-flop, dress shoe, heel). Claude must choose from the lists, so "high top" and
  "korkeavartiset" both become `hi-top sneaker`.
- Source order: seller field, then listing text, then photo.
- Color is stored but never used in scoring.

### Sync: `npm run sync` in `server/`

1. Page through **all** published listings with the Marketplace API (100 per page).
2. Skip listings whose `contentHash` (title, description, public data, image ids) is unchanged.
3. Label and embed new or changed listings, then write them.
4. Delete rows for listings that are no longer returned (sold or closed).

## Part 2: photo search

- Client: a camera button in the search bar (`<input type="file" accept="image/jpeg,image/png,image/webp">`,
  no `capture`, so phones offer both "take photo" and "choose from library").
- Server: `POST /api/search/image`, one photo, JPG, PNG or WEBP, max 5 MB.
  Uses the existing AI rate limit and daily budget.

Steps:

1. Claude labels the photo. If there are several items, it labels the main one (largest, centred).
   If it finds no clothing item, the response says so and shows no groups.
2. CLIP makes the photo vector.
3. Each for-sale listing gets the best group of any of its items:
   - **Same product**: same kind, and brand and model both known and equal.
   - **Exact**: same kind.
   - **50/50**: same group.
   - **Others**: the rest.
4. Order inside a group: `0.7 × photo similarity + 0.3 × share of matching labels`
   (style, material, pattern, details). Listings without a photo use `clipTextVector`
   instead of `photoVector`. The weights are constants, tuned on real data.
5. "Looking for" listings in Same product, Exact or 50/50 go in a separate box:
   "People also look for this".
6. If Claude fails, return one list ordered by photo similarity only.

Response: `{ groups: [{ key, listings }], wanted, labels, fallback, noClothing }`, with `key` one of `same`, `exact`, `close`, `other`. Empty groups are left out. When labelling fails (`fallback`), a `closest` list ranked by looks is returned instead.

## Part 3: upgrade the AI text search

Changes in `aiSearchService.js` and `listingService.js`. The cache, budget, rate limit and
fallbacks stay.

1. **Meaning match.** The query also becomes a text vector. The closest listings by meaning are
   **added** to the keyword results, never instead of them.
2. **Needs use the store first.** `pickForNeed` gets the 30 closest listings from the store (all
   listings, not only the first 100) instead of `getAiCandidates`.
3. **Richer listing data.** `describe()` also gives Claude our labels (kind, style, material).

## Testing

- Unit tests for `rank.js` (group rules, bundles, missing photo, wanted listings).
- Sync run on the real marketplace: row count equals the listing count, re-run skips everything.
- Photo search: one photo per kind found in the data (sneaker, boot, jeans, sweater) gives that
  listing in Exact or higher.
- AI search: for a fixed set of queries, every listing the old search returned is still returned.

## Risks

- Only 26 listings: groups are often small, and Same product is often empty (1 listing has a brand).
- First run downloads the models (about 430 MB in total). Run the sync before the demo.
- Stock: the store does not check stock count. Sold items disappear on the next sync.

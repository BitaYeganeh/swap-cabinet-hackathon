# Smart Search module for the Sharetribe Web Template

Two search features that the built-in Sharetribe search does not have:

1. **AI search.** The shopper types what they need in their own words.
   - "cheap black sneakers size 38 women" becomes the template's own filters.
   - A need such as "something to keep me dry in the rain" makes Claude pick
     the listings in stock that meet it, with a reason for each.
   - If the filters match nothing, it drops the least important ones and
     says which ones it dropped.
2. **Photo search.** The shopper uploads a photo.
   - Claude reads what the item is (kind, brand, material).
   - A local CLIP model reads how it looks.
   - Results are ranked: same model, then same kind, then similar.

3. **Typo-proof keyword search.** The search page's normal Keywords filter
   now tolerates typos, synonyms, Finnish words and seasons. For example,
   "jakcet" finds 12 listings, where the built-in search finds 0. If it
   fails, the built-in keyword search runs as before.

Both features answer with a normal search page URL (`/s?...`), so results use
the template's own SearchPage, listing cards, pagination and listing pages.

## Files

| Where | What |
| --- | --- |
| `server/api/smart-search/` | This module, server side |
| `server/apiRouter.js` | One line mounts it: `router.use('/smart-search', smartSearch)` |
| `src/components/SmartSearch/` | The search bar with the photo button |
| `src/containers/SearchPage/SearchPageWithGrid.js`, `SearchPageWithMap.js` | Show `<SmartSearch />` above the results |
| `src/containers/SearchPage/SearchPage.duck.js` | `withSmartKeywords`: keywords go through the typo-proof search. `keepIdsOrder`: best match first |
| `src/components/SmartSearch/SmartSearchCTA.js` | The Console hero search, plus our bar under it |
| `src/containers/LandingPage/LandingPage.js` | Passes `options.fieldComponents.search` to PageBuilder (the template's official extension point) |

## Endpoints

- `POST /api/smart-search/ai` with `{ "query": "..." }`. Returns `{ query, summary, url, picks, dropped, noPicks }`.
- `POST /api/smart-search/photo` with multipart field `photo` and an optional `item` index. Returns `{ items, groups, labels, fallback, wanted, url }` (`wanted` is `{ id, title }`).
- `GET /api/smart-search/keywords?q=jakcet` returns `{ ids, suggestion }`, ranked best first.
- `GET /api/smart-search/autocomplete?q=jack` returns `{ suggestion, items, places }` for the
  search bar's dropdown while typing. No Claude calls.
- `GET /api/smart-search/stats` returns today's Claude calls and estimated spend.

## Setup

1. Add to `.env`:

   ```
   ANTHROPIC_API_KEY=...
   AI_DAILY_BUDGET_USD=5
   ```

2. Fill the photo index from the marketplace. Run this again when listings change:

   ```
   node server/api/smart-search/vector-store/sync.js
   ```

   Listings that are sold or closed are removed from the index. The search
   page also only shows published listings.

The index lives in `server/api/smart-search/data/`. It is in `.gitignore`.

## Marketplace assumptions

The module expects these listing fields, with search schemas:
- `categoryLevel1`: women / men / kids
- `categoryLevel2`: for example `kids-shoes`
- `size`, `shoeSize`, `kidsSize`, `color`, `condition`

To use it on another marketplace, change `catalog.js` and `toUrlParams` in
`ai-search.js`.

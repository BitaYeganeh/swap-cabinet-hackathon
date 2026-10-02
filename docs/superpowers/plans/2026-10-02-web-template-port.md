# Web Template Port (Batch A + B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the search details that exist in our custom client (`client/`, `server/` on `origin/main`) into the Sharetribe Web Template copy (`web-template/`), so the template gives the buyer the same low-effort search.

**Architecture:** The template already has a Smart Search module (`web-template/server/api/smart-search/`, `web-template/src/components/SmartSearch/`, edits in `web-template/src/containers/SearchPage/SearchPage.duck.js` and `LandingPage.js`; see `web-template/server/api/smart-search/README.md`). Each task ports one feature from its **reference implementation** in `client/` or `server/` (read with `git show origin/main:<path>`) into that module, following the template's own patterns (CommonJS + Express on the server, React + CSS modules + Redux duck on the client, `injectIntl` not required — plain strings are fine like the existing SmartSearch component). Results keep using the template's own SearchPage and listing pages.

**Tech Stack:** Sharetribe Web Template 12.3 (React 18, Redux Toolkit duck, CSS modules, Express API server), Node 26, LanceDB, Transformers.js, Anthropic SDK.

**Spec:** `docs/superpowers/specs/2026-10-01-vector-search-design.md` (search rules) plus the gap table agreed in chat on 2026-10-02 (Batch A + B).

## Global Constraints

- Never lose a listing the current search would find. Meaning matches are only ever added after keyword matches.
- Sold or closed listings are never shown as available (results always come from the live Marketplace API).
- Credentials only in `web-template/.env` (git-ignored). The client never sees `ANTHROPIC_API_KEY`.
- `web-template/server/api/smart-search/data/` is never committed.
- Claude model `claude-opus-5-5` with `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"` (as already in the module).
- Do not change template code outside the files a task names, except a one-line wiring change the task explicitly allows.
- Work in `/Users/farouqzafar/code/Tieto Bootcamp/Hackathon_team4/web-template` on branch `farouq`. Never touch `my-work/` or `mobile-app/`.
- Ports 3000, 3100, 3500, 3999, 4000, 5173 are used by the user's running servers: never kill them. For live checks run the template API server alone on port 3600: `cd web-template && REACT_APP_DEV_API_SERVER_PORT=3600 node server/apiServer.js` (server/apiServer.js reads that variable), and stop it afterwards.
- Live Claude calls cost money: at most 3 per task unless the task says otherwise.
- Tests: server unit tests run with `yarn test-server` (jest, files `server/**/*.test.js`). Client build check: `yarn build-web` (must pass). Run `npx prettier --check` on changed files (the template uses prettier).
- Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Ruling on plan format

This plan ports existing, reviewed code into a different codebase. Each task names the reference code and states the behaviour and acceptance checks precisely, instead of pasting full code; the implementer adapts the reference to the template's conventions.

---

### Task 1: Server quick fixes (Batch A)

**Files:** `server/api/smart-search/catalog.js`, `ai-search.js`, `vector-store/semantic.js`, `vector-store/store.js`, `index.js` (all under `web-template/`). Optional new test: `server/api/smart-search/relax.test.js`.

**Reference:** `origin/main:server/src/config/catalog.js`, `server/src/services/aiSearchService.js`, `server/src/vectorStore/semantic.js`, `server/src/vectorStore/store.js`, `server/src/index.js`.

Do all of:
1. `COLORS` becomes exactly: black, white, grey, silver, brown, bronze, red, pink, orange, yellow, green, blue, multicolor. The system prompt's colour line maps shades like the reference: navy → blue, beige/tan → brown, burgundy → red, purple → pink, gold → yellow, charcoal → grey.
2. The filter-relaxing loop never drops the last thing describing the item: before dropping a key, if no key other than it, `sort` and `category` would remain, stop (reference `relaxUntilFound`).
3. Identical AI requests arriving at the same time share one Claude call (reference `inflight` / `shared`), for both the understand step and the pick step, if the module doesn't already.
4. The pick step's listing description also includes material and (for kids) gender when known (reference `describe`).
5. `similarIds` default `minScore` becomes 0.52, with the reference comment.
6. LanceDB connects with `{ readConsistencyInterval: 5 }` so a running server sees a sync made by another process.
7. Warm up the text and CLIP models in the background once, shortly after the module loads (e.g. `setTimeout(…, 0)` in `index.js` or the first require), only if the store has rows; never block or crash startup; log `Smart Search models ready`.

**Acceptance:** `yarn test-server` passes; if you extract the relax rule into a pure helper, add a jest test for "pink socks" style input (a sole descriptor is never dropped). Live: start the API server on 3600 and check the log shows `Smart Search models ready`; one AI search for "pink socks" does not widen to all listings (1 Claude call) and "burgundy sweater" maps colour to red. Commit.

---

### Task 2: Friendly result notes (Batch B5)

**Files:** `server/api/smart-search/keyword-search.js`, `ai-search.js`, `src/containers/SearchPage/SearchPage.duck.js`, `src/components/SmartSearch/SmartSearch.js` (+ its CSS module).

**Reference:** `origin/main:server/src/services/listingService.js` (`similarOnly`), `server/src/services/aiSearchService.js` (`noPicks`), `client/src/pages/HomePage.tsx` (notes and the "Search the exact words instead" link), `client/src/components/NoExactMatch.tsx`, `client/src/lib/widened.ts`.

1. Keyword search returns `similarOnly: true` when no listing matched the words and every result is a meaning match; the duck stores it next to `smartSearchSuggestion`; on the search page SmartSearch shows: "No item mentions these words, so here are items similar in meaning." (reference wording).
2. AI search returns `noPicks: true` when a need search found no clear fit and fell back to keyword results; SmartSearch shows the reference "Nothing in the shop is a clear fit…" note.
3. When AI search dropped filters, use the reference's friendlier sentence (`widened.ts`) instead of the current "we left out: colour, size".
4. Under any AI result note, show a link "Search the exact words instead" that goes to `/s?keywords=<query>`.

**Acceptance:** `yarn test-server` and `yarn build-web` pass. Live check (≤ 2 Claude calls): keyword search "something comfy" style input that matches no words shows the similar-only note; an AI need search with no fit shows the no-picks note. Commit.

---

### Task 3: AI results survive reload; reasons on cards (Batch B1 + B2)

**Files:** `src/components/SmartSearch/SmartSearch.js`, new `src/components/SmartSearch/aiResults.js`, `src/components/ListingCard/ListingCard.js` (+ its CSS module), the search page results component that renders ListingCard (find it: `SearchResultsPanel`).

**Reference:** `origin/main:client/src/lib/aiPicks.ts`, `client/src/components/ListingCard.tsx` (sparkle reason line), `client/src/pages/HomePage.tsx` (`AiBanner`).

1. After an AI search, store `{ query, summary, picks: {id: reason}, dropped, noPicks }` in `sessionStorage`, keyed by the result URL's search string (wrap all storage access in try/catch). On any `/s` page whose search string matches, SmartSearch restores the banner (summary + notes) and the query text, so a reload keeps them. A different search clears it.
2. `ListingCard` takes an optional `reason` prop and shows it as a short line with a sparkle icon under the title (style like the reference, using the template's CSS variables). SearchResultsPanel passes the stored reason for each listing id; nothing changes when there is none.
3. Remove the current text list of "title: reason" in SmartSearch (the reasons now sit on the cards).

**Acceptance:** `yarn build-web` passes; existing ListingCard tests (if any) pass via `yarn test --watchAll=false src/components/ListingCard`. Live check (1 Claude call): an AI need search shows reasons on cards; reload the page and the banner and reasons are still there. Commit.

---

### Task 4: Autocomplete while typing (Batch B3)

**Files:** `server/api/smart-search/index.js`, new `server/api/smart-search/autocomplete.js`, `src/components/SmartSearch/SmartSearch.js` (+ CSS), optionally a new `src/components/SmartSearch/Suggestions.js`.

**Reference:** `origin/main:server/src/services/listingService.js` (`getAutocomplete`), `server/src/services/fuzzySearch.js` (`autocomplete`, `suggestKeywords` — the template module already has these functions), `client/src/components/SearchBar.tsx` (dropdown, keyboard navigation, ARIA combobox, highlight), `client/src/lib/api.ts` (`getAutocomplete`).

1. `GET /api/smart-search/autocomplete?q=…` returns `{ suggestion, items: [{ id, title, listingType, price, city, image }], places: [...] }` from all published listings (cache the candidate list ~60 s like the reference). No Claude calls, no AI rate limit.
2. SmartSearch shows a dropdown while typing (150 ms debounce, abort stale requests): a "Did you mean …" row, item rows (thumbnail, title with the typed word bold, price or "Wanted", city), place rows. Arrow keys, Enter and Escape work; ARIA combobox/listbox roles as in the reference.
3. Picking an item opens that listing's page (template route `ListingPage`, use `createResourceLocatorString` / `NamedLink` like other template components); picking a place or the suggestion runs a keyword search for it.

**Acceptance:** `yarn test-server` (add a jest test for the endpoint's shaping if practical) and `yarn build-web` pass. Live: `curl "localhost:3600/api/smart-search/autocomplete?q=jak"` returns jacket items. Commit.

---

### Task 5: Photo search details (Batch B4)

**Files:** `server/api/smart-search/photo-search.js`, `src/components/SmartSearch/SmartSearch.js` (+ CSS), new `src/components/SmartSearch/PhotoDropOverlay.js`, the template's top-level layout or `src/app.js`/`Routes` only to mount the overlay once (one line).

**Reference:** `origin/main:server/src/services/imageSearchService.js`, `client/src/pages/PhotoSearchPage.tsx`, `client/src/components/PhotoDropZone.tsx`, `client/src/lib/photoSearch.ts`.

1. Photo search also returns `wanted` (listing ids of "Looking for" listings in same/exact/close, best first, max 8), `fallback` (labels failed) and `labels` (the selected item).
2. SmartSearch shows "We see: <brand model kind>" for a single item; for several items the reference question "We see more than one item. Which one do you want?" with the item buttons (label includes model when known). Shows "Showing the items that look most alike." when `fallback`.
3. A "People also look for this" box lists the wanted listings (small links to their listing pages; fetch titles via the existing listing data or return `{id, title}` from the server).
4. Dropping a photo anywhere on any page starts a photo search (full-screen overlay "Drop your photo to find similar items", window-level drag listeners with an enter/leave counter, wrong file type → 3-second toast "Use a JPG, PNG or WEBP photo"), reusing SmartSearch's existing photo upload path.

**Acceptance:** `yarn test-server` and `yarn build-web` pass. Live (≤ 2 Claude calls): the jeans outfit photo (listing "Dark blue slim jeans L") shows the item question and buttons; a sneaker photo shows "We see: …"; dropping on the landing page starts a search. Commit.

---

### Task 6: Search bar touches (Batch B6)

**Files:** `src/components/SmartSearch/SmartSearch.js` (+ CSS), new `src/components/SmartSearch/aiExamples.js`.

**Reference:** `origin/main:client/src/lib/aiExamples.ts`, `client/src/lib/aiSearch.ts` (cancel, 30 s timeout → keyword fallback), `client/src/lib/search.ts` (`shouldUseAi`), `client/src/components/SearchBar.tsx`.

1. The empty, unfocused box types out the reference example searches as its placeholder (respects `prefers-reduced-motion`; pauses on focus or text; must not break server-side rendering — start after mount).
2. One box: pressing Enter / the search button sends 2+ word queries to AI search and single words to the keyword search (reference `shouldUseAi`). Keep the separate photo button.
3. While AI search runs, a cancel (X) button aborts it; leaving the page aborts it too.
4. After 30 s without an answer, abort and run the keyword search for the same text instead, with a short note.

**Acceptance:** `yarn build-web` passes. Live (≤ 1 Claude call): the placeholder animates; a single word goes straight to `/s?keywords=`; cancel stops a running AI search. Commit.

---

### Task 7: Wanted listings badge (Batch B7)

**Files:** `src/components/ListingCard/ListingCard.js` (+ CSS module).

**Reference:** `origin/main:client/src/components/ListingCard.tsx`, `client/src/lib/format.ts` (`WANTED_TYPE = "in-search-of-clothing"`).

1. For a listing whose `publicData.listingType` is `in-search-of-clothing`, the card shows a "Wanted" badge and shows "Wanted" instead of the price; a card without an image shows "Looking for this item" in the placeholder if the template card has an image placeholder.

**Acceptance:** `yarn build-web` passes; ListingCard tests pass. Live: the search page shows the badge on "Looking for …" listings. Commit.

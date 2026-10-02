const crypto = require("crypto");
const { labelPhoto } = require("../vectorStore/labels");
const { imageVector } = require("../vectorStore/embed");
const { store } = require("../vectorStore/store");
const { rankPhotoSearch } = require("../vectorStore/rank");
const { getListingsByIds } = require("./listingService");
const usage = require("./aiUsage");

class ImageSearchError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Switching to another item in the same photo re-sends the photo; remembering
// what we already read from it means the switch costs no new Claude call.
const PHOTO_CACHE_SIZE = 50;
const photoCache = new Map(); // sha1 of the photo -> { items, queryVector }

function remember(key, value) {
  photoCache.delete(key);
  if (photoCache.size >= PHOTO_CACHE_SIZE) photoCache.delete(photoCache.keys().next().value);
  photoCache.set(key, value);
}

async function readPhoto(buffer, mediaType) {
  const key = crypto.createHash("sha1").update(buffer).digest("hex");
  const hit = photoCache.get(key);
  if (hit) {
    remember(key, hit);
    return hit;
  }

  if (usage.overBudget()) throw new ImageSearchError("Photo search has reached today's limit, try again tomorrow", 503);

  // Labels and vector in parallel. Claude failing is not fatal: we still rank by looks.
  const [items, queryVector] = await Promise.all([
    labelPhoto(buffer, mediaType).catch((error) => {
      console.error("Photo labelling failed, ranking by looks only:", error.message);
      return null;
    }),
    imageVector(buffer).catch(() => {
      throw new ImageSearchError("Couldn't read this photo, try a JPG, PNG or WEBP", 400);
    }),
  ]);

  // A failed labelling is not remembered, so the next try asks Claude again.
  if (items) remember(key, { items, queryVector });
  return { items, queryVector };
}

// `itemIndex` picks which of the items seen in the photo to search for.
async function searchByPhoto(buffer, mediaType, itemIndex = 0) {
  const started = Date.now();
  const [{ items, queryVector }, rows] = await Promise.all([readPhoto(buffer, mediaType), store.all()]);

  if (items && items.length === 0) {
    return { labels: null, items: [], selected: 0, fallback: false, noClothing: true, groups: [], wanted: [] };
  }

  const selected = items ? Math.min(Math.max(0, itemIndex), items.length - 1) : 0;
  const queryItem = items ? items[selected] : null;
  const ranked = rankPhotoSearch({ queryItem, queryVector, rows });

  const ids = [...ranked.groups.flatMap((g) => g.ids), ...ranked.wanted].map((x) => x.id);
  const listings = await getListingsByIds(ids);
  const resolve = (list) => list.map((x) => listings.get(x.id)).filter(Boolean);

  console.log(
    `Photo search -> ${queryItem ? queryItem.kind : "no labels"}:`,
    ranked.groups.map((g) => `${g.key} ${g.ids.length}`).join(", "),
    `[${Date.now() - started}ms]`
  );

  return {
    labels: queryItem,
    items: items || [],
    selected,
    fallback: !queryItem,
    noClothing: false,
    groups: ranked.groups.map((g) => ({ key: g.key, listings: resolve(g.ids) })).filter((g) => g.listings.length),
    wanted: resolve(ranked.wanted),
  };
}

module.exports = { searchByPhoto, ImageSearchError };

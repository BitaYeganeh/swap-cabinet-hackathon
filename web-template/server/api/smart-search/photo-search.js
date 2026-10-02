// Photo search: a shopper uploads a photo of something they like. Claude reads
// what the item is (kind, brand, material...), a local CLIP model reads how it
// looks, and both are compared with every listing in the local vector store.
// The answer is a Web Template search URL listing the closest items (/s?ids=...).
//
// Adapted from the Hackathon team 4 search server.

const crypto = require('crypto');
const { labelPhoto } = require('./vector-store/labels');
const { imageVector } = require('./vector-store/embed');
const { store } = require('./vector-store/store');
const { rankPhotoSearch } = require('./vector-store/rank');
const usage = require('./usage');

// The search page shows 24 listings per page.
const MAX_RESULTS = 24;

class PhotoSearchError extends Error {
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
  const key = crypto
    .createHash('sha1')
    .update(buffer)
    .digest('hex');
  const hit = photoCache.get(key);
  if (hit) {
    remember(key, hit);
    return hit;
  }

  if (usage.overBudget()) {
    throw new PhotoSearchError("Photo search has reached today's limit, try again tomorrow", 503);
  }

  // Labels and vector in parallel. Claude failing is not fatal: we still rank by looks.
  const [items, queryVector] = await Promise.all([
    labelPhoto(buffer, mediaType).catch(error => {
      console.error('Photo labelling failed, ranking by looks only:', error.message);
      return null;
    }),
    imageVector(buffer).catch(() => {
      throw new PhotoSearchError("Couldn't read this photo, try a JPG, PNG or WEBP", 400);
    }),
  ]);

  if (items) remember(key, { items, queryVector });
  return { items, queryVector };
}

// `itemIndex` picks which of the items seen in the photo to search for.
async function searchByPhoto(buffer, mediaType, itemIndex = 0) {
  const [{ items, queryVector }, rows] = await Promise.all([
    readPhoto(buffer, mediaType),
    store.all(),
  ]);

  if (items && items.length === 0) {
    return { items: [], selected: 0, noClothing: true, groups: [], url: null };
  }
  if (rows.length === 0) {
    throw new PhotoSearchError('Photo search has no listings yet. Run the smart search sync.', 503);
  }

  const selected = items ? Math.min(Math.max(0, itemIndex), items.length - 1) : 0;
  const queryItem = items ? items[selected] : null;
  const ranked = rankPhotoSearch({ queryItem, queryVector, rows });

  // Best groups first ("same" model, "exact" kind, "close" kind, then the rest).
  const ids = ranked.groups.flatMap(g => g.ids.map(x => x.id)).slice(0, MAX_RESULTS);
  const groups = ranked.groups.map(g => ({ key: g.key, count: g.ids.length }));

  console.log(
    `Smart photo search -> ${queryItem ? queryItem.kind : 'no labels'}:`,
    groups.map(g => `${g.key} ${g.count}`).join(', ')
  );

  return {
    items: items || [],
    selected,
    noClothing: false,
    groups,
    // Sold or closed listings drop out here: the search page only shows published ones.
    url: ids.length ? `/s?${new URLSearchParams({ ids: ids.join(',') })}` : null,
  };
}

module.exports = { searchByPhoto, PhotoSearchError };

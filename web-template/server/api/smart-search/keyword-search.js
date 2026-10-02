// Typo-tolerant keyword search: "jakcet" finds jackets, "tee" finds t-shirts,
// "puuvilla" finds cotton, "autumn clothes" finds wool sweaters and boots.
// Listings that match by meaning are added after the keyword matches.
//
// The answer is a ranked list of listing ids. The search page then asks the
// Marketplace API for those ids together with the shopper's other filters, so
// category, price and the rest still apply exactly as before.
//
// Adapted from the Hackathon team 4 search server.

const sdk = require('./sdk');
const { searchListings, suggestKeywords } = require('./fuzzySearch');
const { similarIds } = require('./vector-store/semantic');

// The Marketplace API accepts at most 100 ids in one query.
const MAX_IDS = 100;
const MAX_PAGES = 10;
const CACHE_TTL_MS = 60 * 1000;

// "Fleminginkatu 5, 00530 Helsinki, Finland"
//   -> { street: "Fleminginkatu", postcode: "00530", city: "Helsinki", country: "Finland" }
function parseAddress(address) {
  if (!address) return { street: null, postcode: null, city: null, country: null };
  const parts = address.split(',').map(p => p.trim());
  const cityPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return {
    street: parts.length >= 3 ? parts[0].replace(/\s*\d+\w?$/, '') || null : null,
    postcode: cityPart.match(/^\d{3,}/)?.[0] || null,
    city: cityPart.replace(/^\d+\s*/, '') || null,
    country: parts.length >= 2 ? parts[parts.length - 1] : null,
  };
}

// A listing in the shape the fuzzy search reads.
function toSearchable(listing) {
  const { title, description, publicData = {} } = listing.attributes;
  return {
    id: listing.id.uuid,
    title,
    description,
    category: publicData.categoryLevel1,
    subcategory: publicData.categoryLevel2,
    condition: publicData.condition,
    color: publicData.color,
    brand: publicData.brand,
    material: publicData.material,
    ...parseAddress(publicData.location?.address),
  };
}

// Every published listing, shared by all searches for a minute.
let cached = null;

async function allListings() {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.listings;

  const listings = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await sdk.listings.query({ perPage: 100, page });
    listings.push(...res.data.data.map(toSearchable));
    if (page >= res.data.meta.totalPages) break;
  }
  cached = { listings, at: Date.now() };
  return listings;
}

async function searchKeywordIds(rawKeywords) {
  const keywords = String(rawKeywords ?? '')
    .trim()
    .slice(0, 200);
  if (!keywords) return { ids: [], suggestion: null };

  const listings = await allListings();
  let matches = searchListings(listings, keywords);
  const suggestion = suggestKeywords(listings, keywords);

  // Nothing matched as typed, but a corrected spelling does: search that instead.
  if (!matches.length && suggestion) matches = searchListings(listings, suggestion);

  // Tell the shopper which spelling the results are for ("jakcet" -> "jacket").
  const corrected = !!suggestion && matches.length > 0;

  // Add listings that match by meaning ("warm" -> wool sweater), only after
  // the keyword matches, never instead of them.
  const found = new Set(matches.map(l => l.id));
  const known = new Set(listings.map(l => l.id));
  const extra = (await similarIds(keywords, { limit: MAX_IDS })).filter(
    id => !found.has(id) && known.has(id)
  );

  const ids = [...matches.map(l => l.id), ...extra].slice(0, MAX_IDS);
  return { ids, keywordMatches: matches.length, suggestion, corrected };
}

module.exports = { searchKeywordIds };

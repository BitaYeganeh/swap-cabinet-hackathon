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

// A small image for the search bar's suggestions. scaled-small is a built-in
// Sharetribe variant, so it needs no variant config.
const IMAGE_VARIANT = 'scaled-small';
const QUERY_PARAMS = {
  perPage: 100,
  // Same stock rule as the template's search: sold-out listings are not shown.
  minStock: 1,
  stockMode: 'match-undefined',
  include: ['images'],
  'fields.image': [`variants.${IMAGE_VARIANT}`],
};

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

// URL of the listing's first image: the small variant, or any variant it has.
function firstImageUrl(listing, imagesById) {
  const ref = listing.relationships?.images?.data?.[0];
  const variants = ref ? imagesById.get(ref.id.uuid)?.attributes?.variants || {} : {};
  return (variants[IMAGE_VARIANT] || Object.values(variants)[0])?.url || null;
}

// A listing in the shape the fuzzy search reads, plus what the search bar's
// suggestions show (price, listing type, image).
function toSearchable(listing, imagesById = new Map()) {
  const { title, description, price, publicData = {} } = listing.attributes;
  return {
    id: listing.id.uuid,
    title,
    description,
    listingType: publicData.listingType || null,
    price: price ? { amount: price.amount, currency: price.currency } : null,
    image: firstImageUrl(listing, imagesById),
    category: publicData.categoryLevel1,
    subcategory: publicData.categoryLevel2,
    condition: publicData.condition,
    color: publicData.color,
    brand: publicData.brand,
    material: publicData.material,
    ...parseAddress(publicData.location?.address),
  };
}

// Every published listing, shared by all searches for a minute. Requests that
// arrive while the list is loading wait for that same load.
let cached = null;
let loading = null;

async function fetchAllListings() {
  const listings = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await sdk.listings.query({ ...QUERY_PARAMS, page });
    const imagesById = new Map(
      (res.data.included || []).filter(r => r.type === 'image').map(r => [r.id.uuid, r])
    );
    listings.push(...res.data.data.map(l => toSearchable(l, imagesById)));
    if (page >= res.data.meta.totalPages) break;
  }
  return listings;
}

async function allListings() {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.listings;
  if (!loading) {
    loading = fetchAllListings()
      .then(listings => {
        cached = { listings, at: Date.now() };
        return listings;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
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
  // Nothing mentions the words, so every result is a meaning match.
  const similarOnly = matches.length === 0 && extra.length > 0;
  return { ids, keywordMatches: matches.length, suggestion, corrected, similarOnly };
}

module.exports = { searchKeywordIds, allListings };

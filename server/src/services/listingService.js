const sharetribe = require("../config/sharetribe");
const { searchListings, suggestKeywords, autocomplete } = require("./fuzzySearch");

const PER_PAGE = 12;

// Keyword search fetches every listing that passes the other filters and ranks
// them here, so it can tolerate typos. These bound that fetch.
const FETCH_PER_PAGE = 100; // Sharetribe maximum
const MAX_FETCH_PAGES = 10;
const CANDIDATE_TTL_MS = 60 * 1000;

// UI sort keys -> Sharetribe sort values ("-" prefix means ascending).
const SORTS = {
  newest: "createdAt",
  "price-asc": "-price",
  "price-desc": "price",
};

const eurosToSubunits = (value) => Math.round(Number(value) * 100);

const INCLUDES = {
  include: ["images", "author"],
  "fields.image": ["variants.landscape-crop", "variants.landscape-crop2x"],
  "fields.user": ["profile.displayName"],
};

function buildQuery({ keywords, category, condition, color, minPrice, maxPrice, sort, page }) {
  const query = {
    perPage: PER_PAGE,
    page: Math.max(1, parseInt(page, 10) || 1),
    ...INCLUDES,
  };

  if (keywords && keywords.trim()) query.keywords = keywords.trim();
  if (category) query.pub_categoryLevel1 = category;
  if (condition) query.pub_condition = condition;
  if (color) query.pub_color = color;

  if (minPrice || maxPrice) {
    // Sharetribe price range is "min,max" in subunits, max exclusive.
    const min = minPrice ? eurosToSubunits(minPrice) : 0;
    const max = maxPrice ? eurosToSubunits(maxPrice) + 1 : "";
    query.price = `${min},${max}`;
  }

  if (SORTS[sort]) query.sort = SORTS[sort];

  return query;
}

// "Fleminginkatu 5, 00530 Helsinki, Finland"
//   -> { street: "Fleminginkatu", postcode: "00530", city: "Helsinki", country: "Finland" }
function parseAddress(address) {
  if (!address) return { street: null, postcode: null, city: null, country: null };
  const parts = address.split(",").map((p) => p.trim());
  const cityPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return {
    // Street name without the house number, so searching "5" doesn't match it.
    street: parts.length >= 3 ? parts[0].replace(/\s*\d+\w?$/, "") || null : null,
    postcode: cityPart.match(/^\d{3,}/)?.[0] || null,
    city: cityPart.replace(/^\d+\s*/, "") || null,
    country: parts.length >= 2 ? parts[parts.length - 1] : null,
  };
}

function toListing(listing, includedById) {
  const { attributes, relationships } = listing;
  const publicData = attributes.publicData || {};

  const images = (relationships?.images?.data || [])
    .map((ref) => includedById[ref.id.uuid])
    .filter(Boolean)
    .map((image) => ({
      url: image.attributes.variants["landscape-crop"]?.url,
      url2x: image.attributes.variants["landscape-crop2x"]?.url,
    }));

  const address = publicData.location?.address || null;
  const { street, postcode, city, country } = parseAddress(address);

  const authorRef = relationships?.author?.data;
  const author = authorRef && includedById[authorRef.id.uuid];

  return {
    id: listing.id.uuid,
    title: attributes.title,
    description: attributes.description,
    createdAt: attributes.createdAt,
    price: attributes.price
      ? { amount: attributes.price.amount, currency: attributes.price.currency }
      : null,
    listingType: publicData.listingType,
    category: publicData.categoryLevel1,
    subcategory: publicData.categoryLevel2,
    condition: publicData.condition,
    conditionDetails: publicData.conditionDetails,
    color: publicData.color,
    size: publicData.size || publicData.shoeSize || publicData.kidsSize,
    brand: publicData.brand,
    material: publicData.material,
    careInstructions: publicData.careInstructions,
    petFreeHome: publicData.petFreeHome === "yes",
    smokeFreeHome: publicData.smokeFreeHome === "yes",
    shippingEnabled: !!publicData.shippingEnabled,
    pickupEnabled: !!publicData.pickupEnabled,
    shippingPrice: publicData.shippingPriceInSubunitsOneItem ?? null,
    address,
    street,
    postcode,
    city,
    country,
    sellerName: author?.attributes?.profile?.displayName || null,
    images,
  };
}

function mapResponse(response) {
  const { data, included = [], meta } = response.data;
  const includedById = Object.fromEntries(included.map((item) => [item.id.uuid, item]));
  return { listings: data.map((listing) => toListing(listing, includedById)), meta };
}

// Filter query -> { expires, promise } so paging through results doesn't refetch.
const candidateCache = new Map();

// Every listing matching the non-keyword filters, across Sharetribe pages.
function getCandidates(filters) {
  const { keywords, sort, page, ...rest } = buildQuery(filters);
  const key = JSON.stringify(rest);

  const cached = candidateCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.promise;

  const promise = (async () => {
    const listings = [];
    for (let page = 1; page <= MAX_FETCH_PAGES; page++) {
      const response = await sharetribe.listings.query({ ...rest, perPage: FETCH_PER_PAGE, page });
      const { listings: batch, meta } = mapResponse(response);
      listings.push(...batch);
      if (page >= meta.totalPages) break;
    }
    return listings;
  })();

  candidateCache.set(key, { expires: Date.now() + CANDIDATE_TTL_MS, promise });
  promise.catch(() => candidateCache.delete(key));
  return promise;
}

const priceOf = (listing) => listing.price?.amount ?? Infinity;

// Same sorts as SORTS, applied in memory. No sort keeps relevance order.
const IN_MEMORY_SORTS = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  "price-asc": (a, b) => priceOf(a) - priceOf(b),
  "price-desc": (a, b) => priceOf(b) - priceOf(a),
};

async function searchByKeywords(params) {
  const candidates = await getCandidates(params);
  const keywords = params.keywords.trim();

  let matches = searchListings(candidates, keywords);
  const suggestion = suggestKeywords(candidates, keywords);

  // Nothing matched as typed, but a corrected spelling does: search that instead.
  if (!matches.length && suggestion) matches = searchListings(candidates, suggestion);

  if (IN_MEMORY_SORTS[params.sort]) matches = [...matches].sort(IN_MEMORY_SORTS[params.sort]);

  const totalItems = matches.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));
  const page = Math.min(Math.max(1, parseInt(params.page, 10) || 1), totalPages);

  return {
    listings: matches.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    pagination: { page, totalPages, totalItems, perPage: PER_PAGE },
    suggestion,
  };
}

async function getListings(params = {}) {
  if (params.keywords && params.keywords.trim()) return searchByKeywords(params);

  const { listings, meta } = mapResponse(await sharetribe.listings.query(buildQuery(params)));

  return {
    listings,
    pagination: {
      page: meta.page,
      totalPages: meta.totalPages,
      totalItems: meta.totalItems,
      perPage: meta.perPage,
    },
  };
}

async function getListing(id) {
  const response = await sharetribe.listings.show({ id, ...INCLUDES });
  const { data, included = [] } = response.data;

  const includedById = Object.fromEntries(included.map((item) => [item.id.uuid, item]));

  return toListing(data, includedById);
}

// Search-bar suggestions: matching listings (slimmed down) and places.
async function getAutocomplete({ q, category } = {}) {
  const { items, places } = autocomplete(await getCandidates({ category }), q || "");
  return {
    items: items.map((l) => ({
      id: l.id,
      title: l.title,
      listingType: l.listingType,
      price: l.price,
      city: l.city,
      image: l.images[0]?.url || null,
    })),
    places,
  };
}

module.exports = {
  getListings,
  getListing,
  getAutocomplete,
};

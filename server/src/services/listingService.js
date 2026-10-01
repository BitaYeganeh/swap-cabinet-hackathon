const sharetribe = require("../config/sharetribe");
const { searchListings, suggestKeywords, autocomplete } = require("./fuzzySearch");
const { similarIds, labelsById } = require("../vectorStore/semantic");
const { CATEGORIES, GENDERS, TYPES } = require("../config/catalog");

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

// Size filter values: "m" (clothing), "shoe-38" (EU shoe size) or "kids-5y" (kids' age).
function applySize(query, size) {
  if (!size) return;
  if (size.startsWith("shoe-")) query.pub_shoeSize = size.slice(5);
  else if (size.startsWith("kids-")) query.pub_kidsSize = size.slice(5);
  else query.pub_size = size;
}

const WANTED_TYPE = "in-search-of-clothing";

function buildQuery({ keywords, category, type, size, condition, color, minPrice, maxPrice, sort, page, ids }) {
  const query = {
    perPage: PER_PAGE,
    page: Math.max(1, parseInt(page, 10) || 1),
    ...INCLUDES,
  };

  // Specific listings, e.g. the AI's picks. Order is restored in getListings.
  if (ids) query.ids = ids;
  if (keywords && keywords.trim()) query.keywords = keywords.trim();
  if (category) query.pub_categoryLevel1 = category;
  // Types are stored per category ("kids-shoes"); without a category, match any of them.
  if (TYPES.includes(type)) {
    query.pub_categoryLevel2 = category
      ? `${category}-${type}`
      : CATEGORIES.map((c) => `${c}-${type}`).join(",");
  }
  applySize(query, size);
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

// "dress shoes" is a shoe style, not a hint.
const GIRL_WORDS = /\b(girls?|dress(es)?(?! shoes)|skirts?|blouses?|leggings|tights|butterfl(y|ies)|princess|pink)\b/i;
const BOY_WORDS = /\b(boys?)\b/i;

// Listings have no gender field yet, so for kids items fall back to keywords in
// the title/description. Anything without a clear hint counts as unisex and
// appears under both Boys and Girls. A `gender` field added in Sharetribe
// ("boys" / "girls" / "unisex") takes precedence.
function kidsGender(attributes, publicData) {
  if (publicData.categoryLevel1 !== "kids") return null;
  const explicit = publicData.gender || publicData.kidsGender;
  if (["boys", "girls", "unisex"].includes(explicit)) return explicit;

  const text = `${attributes.title} ${attributes.description || ""}`;
  const girl = GIRL_WORDS.test(text);
  const boy = BOY_WORDS.test(text);
  if (girl && !boy) return "girls";
  if (boy && !girl) return "boys";
  return "unisex";
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
    gender: kidsGender(attributes, publicData),
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
    geolocation: attributes.geolocation
      ? { lat: attributes.geolocation.lat, lng: attributes.geolocation.lng }
      : null,
    sellerName: author?.attributes?.profile?.displayName || null,
    images,
  };
}

const normalizeBrand = (brand) => (brand || "").trim().toLowerCase();

// Brand isn't in the marketplace search schema (Sharetribe ignores pub_brand)
// and kids gender is inferred, so both are applied here after fetching.
function localFilters(params) {
  return {
    brand: normalizeBrand(params.brand),
    gender: params.category === "kids" && GENDERS.includes(params.gender) ? params.gender : null,
  };
}

const matchesFilters = ({ brand, gender }) => (listing) =>
  (!brand || normalizeBrand(listing.brand) === brand) &&
  (!gender || listing.gender === gender || listing.gender === "unisex");

// Fetch every page of a query (100 per page, the Marketplace API maximum).
async function queryAll(query) {
  const data = [];
  const included = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await sharetribe.listings.query({ ...query, perPage: FETCH_PER_PAGE, page });
    data.push(...response.data.data);
    included.push(...(response.data.included || []));
    totalPages = response.data.meta.totalPages;
    page++;
  } while (page <= totalPages);

  return { data, included };
}

// For brand or gender filters, fetch everything matching the other filters
// (already sorted) and filter + paginate locally.
async function getListingsFiltered(query, { brand, gender }) {
  const { perPage, page, ...rest } = query;
  const { data, included } = await queryAll(rest);

  const includedById = Object.fromEntries(included.map((item) => [item.id.uuid, item]));
  const matches = data
    .map((listing) => toListing(listing, includedById))
    .filter(matchesFilters({ brand, gender }));

  const start = (page - 1) * perPage;

  return {
    listings: matches.slice(start, start + perPage),
    pagination: {
      page,
      totalPages: Math.ceil(matches.length / perPage),
      totalItems: matches.length,
      perPage,
    },
  };
}

const BRANDS_CACHE_MS = 5 * 60 * 1000;
let brandsCache = null; // { promise, expiresAt }

// Distinct brands across all listings, most listings first: [{ name, count }]
async function fetchBrands() {
  const { data } = await queryAll({ "fields.listing": ["publicData"] });
  const brands = new Map();

  for (const listing of data) {
    const name = listing.attributes.publicData?.brand?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const entry = brands.get(key) || { name, count: 0 };
    entry.count++;
    brands.set(key, entry);
  }

  return [...brands.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function getBrands() {
  if (!brandsCache || brandsCache.expiresAt < Date.now()) {
    const promise = fetchBrands().catch((error) => {
      brandsCache = null; // retry on the next request instead of caching the failure
      throw error;
    });
    brandsCache = { promise, expiresAt: Date.now() + BRANDS_CACHE_MS };
  }
  return brandsCache.promise;
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
  const candidates = (await getCandidates(params)).filter(matchesFilters(localFilters(params)));
  const keywords = params.keywords.trim();

  let matches = searchListings(candidates, keywords);
  const suggestion = suggestKeywords(candidates, keywords);

  // Nothing matched as typed, but a corrected spelling does: search that instead.
  if (!matches.length && suggestion) matches = searchListings(candidates, suggestion);

  // Add listings that match by meaning ("warm" -> wool sweater). Only added
  // after the keyword matches, never instead of them; filters still apply
  // because only candidates can be added.
  const found = new Set(matches.map((l) => l.id));
  const byId = new Map(candidates.map((l) => [l.id, l]));
  const extra = (await similarIds(keywords)).filter((id) => !found.has(id) && byId.has(id)).map((id) => byId.get(id));
  matches = [...matches, ...extra];

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
  // AI picks are an exact list of ids, so they skip the keyword search.
  if (!params.ids && params.keywords && params.keywords.trim()) return searchByKeywords(params);

  const filters = localFilters(params);
  if (filters.brand || filters.gender) return getListingsFiltered(buildQuery(params), filters);

  const { listings, meta } = mapResponse(await sharetribe.listings.query(buildQuery(params)));

  // Sharetribe ignores the order of `ids`; keep the order we asked for (the AI's ranking).
  if (params.ids) {
    const rank = params.ids.split(",");
    listings.sort((a, b) => rank.indexOf(a.id) - rank.indexOf(b.id));
  }

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

const AI_CANDIDATES = 30;

// Buyable listings matching the filters (keywords ignored), for the AI to
// choose from. "Wanted" requests are left out: they aren't for sale.
// With a query, only the closest by meaning, so the prompt stays small as the
// marketplace grows; each comes with our labels so Claude knows more.
async function getAiCandidates(params = {}, query = null) {
  const all = (await getCandidates({ ...params, keywords: "", ids: "" }))
    .filter((listing) => listing.listingType !== WANTED_TYPE)
    .filter(matchesFilters(localFilters(params)));

  let chosen = all;
  if (query) {
    const order = await similarIds(query, { limit: AI_CANDIDATES * 3, minScore: 0 });
    const byId = new Map(all.map((l) => [l.id, l]));
    const ranked = order.map((id) => byId.get(id)).filter(Boolean);
    // Store empty or behind: fall back to the first listings, as before.
    chosen = (ranked.length ? ranked : all).slice(0, AI_CANDIDATES);
  }

  const labels = await labelsById(chosen.map((l) => l.id));
  return chosen.map((listing) => ({ ...listing, labels: labels.get(listing.id) || null }));
}

// Search-bar suggestions: matching listings (slimmed down), places, and a
// spelling correction for what has been typed so far.
async function getAutocomplete({ q, category } = {}) {
  const candidates = await getCandidates({ category });
  const { items, places } = autocomplete(candidates, q || "");
  return {
    suggestion: q ? suggestKeywords(candidates, q, { typing: true }) : null,
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

// Full listing data for the given ids, 100 per request (Sharetribe maximum).
// Listings that are no longer published are simply missing from the map.
async function getListingsByIds(ids) {
  const byId = new Map();
  for (let i = 0; i < ids.length; i += FETCH_PER_PAGE) {
    const chunk = ids.slice(i, i + FETCH_PER_PAGE);
    const response = await sharetribe.listings.query({ ids: chunk.join(","), perPage: FETCH_PER_PAGE, ...INCLUDES });
    for (const listing of mapResponse(response).listings) byId.set(listing.id, listing);
  }
  return byId;
}

module.exports = {
  getListings,
  getListing,
  getAutocomplete,
  getBrands,
  getAiCandidates,
  getListingsByIds,
};

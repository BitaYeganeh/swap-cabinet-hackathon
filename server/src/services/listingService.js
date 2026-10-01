const sharetribe = require("../config/sharetribe");

const PER_PAGE = 12;

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

// "Fleminginkatu 5, 00530 Helsinki, Finland" -> "Helsinki"
function cityFromAddress(address) {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  const cityPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return cityPart.replace(/^\d+\s*/, "") || null;
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
    address: publicData.location?.address || null,
    city: cityFromAddress(publicData.location?.address),
    sellerName: author?.attributes?.profile?.displayName || null,
    images,
  };
}

// Fetch every page of a query (100 per page, the Marketplace API maximum).
async function queryAll(query) {
  const data = [];
  const included = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await sharetribe.listings.query({ ...query, perPage: 100, page });
    data.push(...response.data.data);
    included.push(...(response.data.included || []));
    totalPages = response.data.meta.totalPages;
    page++;
  } while (page <= totalPages);

  return { data, included };
}

const normalizeBrand = (brand) => (brand || "").trim().toLowerCase();

// Brand isn't in the marketplace search schema, so Sharetribe ignores pub_brand.
// Instead fetch everything matching the other filters (already sorted) and
// filter + paginate here.
async function getListingsByBrand(params) {
  const { perPage, page: _page, ...query } = buildQuery(params);
  const { data, included } = await queryAll(query);

  const wanted = normalizeBrand(params.brand);
  const matches = data.filter((listing) => normalizeBrand(listing.attributes.publicData?.brand) === wanted);

  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const includedById = Object.fromEntries(included.map((item) => [item.id.uuid, item]));

  return {
    listings: matches
      .slice((page - 1) * perPage, page * perPage)
      .map((listing) => toListing(listing, includedById)),
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

async function getListings(params = {}) {
  if (params.brand && params.brand.trim()) return getListingsByBrand(params);

  const response = await sharetribe.listings.query(buildQuery(params));
  const { data, included = [], meta } = response.data;

  const includedById = Object.fromEntries(included.map((item) => [item.id.uuid, item]));

  return {
    listings: data.map((listing) => toListing(listing, includedById)),
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

module.exports = {
  getListings,
  getListing,
  getBrands,
};

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

// Subcategory types, stored in Sharetribe as categoryLevel2 = "<category>-<type>".
const TYPES = ["tops", "bottoms", "shoes", "accessories", "bundles"];

const GENDERS = ["boys", "girls"];

// The gender filter is applied here rather than by Sharetribe, so fetch every
// match in one go (Sharetribe caps perPage at 100) and paginate locally.
const MAX_PER_PAGE = 100;

function buildQuery({ keywords, category, type, condition, color, minPrice, maxPrice, sort, page }) {
  const query = {
    perPage: PER_PAGE,
    page: Math.max(1, parseInt(page, 10) || 1),
    ...INCLUDES,
  };

  if (keywords && keywords.trim()) query.keywords = keywords.trim();
  if (category) query.pub_categoryLevel1 = category;
  if (category && TYPES.includes(type)) query.pub_categoryLevel2 = `${category}-${type}`;
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
    address: publicData.location?.address || null,
    city: cityFromAddress(publicData.location?.address),
    geolocation: attributes.geolocation
      ? { lat: attributes.geolocation.lat, lng: attributes.geolocation.lng }
      : null,
    sellerName: author?.attributes?.profile?.displayName || null,
    images,
  };
}

async function getListings(params = {}) {
  const query = buildQuery(params);
  const gender = params.category === "kids" && GENDERS.includes(params.gender) ? params.gender : null;

  if (gender) return getListingsByGender(query, gender);

  const response = await sharetribe.listings.query(query);
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

async function getListingsByGender(query, gender) {
  const { page } = query;
  const response = await sharetribe.listings.query({ ...query, page: 1, perPage: MAX_PER_PAGE });
  const { data, included = [] } = response.data;

  const includedById = Object.fromEntries(included.map((item) => [item.id.uuid, item]));
  const matches = data
    .map((listing) => toListing(listing, includedById))
    .filter((listing) => listing.gender === gender || listing.gender === "unisex");

  const start = (page - 1) * PER_PAGE;

  return {
    listings: matches.slice(start, start + PER_PAGE),
    pagination: {
      page,
      totalPages: Math.ceil(matches.length / PER_PAGE),
      totalItems: matches.length,
      perPage: PER_PAGE,
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
};

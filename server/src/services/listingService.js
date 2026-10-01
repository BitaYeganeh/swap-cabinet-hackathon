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

async function getListings(params = {}) {
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
};

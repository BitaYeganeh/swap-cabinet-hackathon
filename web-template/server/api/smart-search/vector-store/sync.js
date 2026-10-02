// Fills the local vector store from the real marketplace.
// Run from server/: npm run sync
const crypto = require("crypto");

const PER_PAGE = 100; // Marketplace API maximum
const CONCURRENCY = 3; // gentle on the Claude and Sharetribe rate limits

const contentHash = (source) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify([source.title, source.description, source.listingType, source.subcategory, source.material, source.color, source.brand, source.imageIds]))
    .digest("hex");

// Every published listing, across all pages. Closed and sold listings are not
// returned by the Marketplace API, so they drop out of the store on sync.
async function fetchAllListings() {
  const sharetribe = require("../sdk");
  const sources = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await sharetribe.listings.query({
      perPage: PER_PAGE,
      page,
      include: ["images"],
      "fields.image": ["variants.default"],
    });
    const images = new Map((response.data.included || []).map((item) => [item.id.uuid, item]));

    for (const listing of response.data.data) {
      const { title, description, publicData = {} } = listing.attributes;
      const imageIds = (listing.relationships?.images?.data || []).map((ref) => ref.id.uuid);
      const first = imageIds.length ? images.get(imageIds[0]) : null;
      sources.push({
        id: listing.id.uuid,
        title,
        description,
        listingType: publicData.listingType,
        subcategory: publicData.categoryLevel2,
        material: publicData.material,
        color: publicData.color,
        brand: publicData.brand,
        imageUrl: first?.attributes?.variants?.default?.url || null,
        imageIds,
      });
    }

    totalPages = response.data.meta.totalPages;
    page++;
  } while (page <= totalPages);

  return sources;
}

async function buildRow(source) {
  const { labelListing } = require("./labels");
  const { imageVector, clipTextVector, textVector } = require("./embed");
  const { applySellerFields, itemsText } = require("./items");
  const { PHOTO_DIMS } = require("./store");

  const items = applySellerFields(await labelListing(source), source);
  const labels = itemsText(items);
  const description = (source.description || "").replace(/\s*Photo by .*$/s, "");

  const [photoVector, clipText, text] = await Promise.all([
    source.imageUrl ? imageVector(source.imageUrl) : Promise.resolve(new Array(PHOTO_DIMS).fill(0)),
    clipTextVector(`${source.title}. ${labels}`),
    textVector(`${source.title}. ${labels}. ${description}`),
  ]);

  return {
    id: source.id,
    title: source.title,
    listingType: source.listingType,
    contentHash: contentHash(source),
    items,
    hasPhoto: !!source.imageUrl,
    photoVector,
    clipTextVector: clipText,
    textVector: text,
  };
}

async function syncListings({ store, sources, buildRow: build, log = console.log }) {
  const existing = new Map((await store.all()).map((row) => [row.id, row.contentHash]));
  const result = { added: 0, updated: 0, unchanged: 0, removed: 0, failed: 0 };

  const todo = [];
  for (const source of sources) {
    if (existing.get(source.id) === contentHash(source)) result.unchanged++;
    else todo.push(source);
  }

  // A few at a time; each row is written as soon as it is ready.
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const source = todo[next++];
      try {
        const row = await build(source);
        await store.upsert([row]);
        if (existing.has(source.id)) result.updated++;
        else result.added++;
        log(`  ok  ${source.title}  [${row.items?.map((i) => i.kind).join(", ") ?? ""}]`);
      } catch (error) {
        result.failed++;
        log(`  FAIL ${source.title}: ${error.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (sources.length === 0 && existing.size > 0) {
    log("Sharetribe returned no listings; not removing anything");
    return result;
  }

  const current = new Set(sources.map((s) => s.id));
  const gone = [...existing.keys()].filter((id) => !current.has(id));
  await store.remove(gone);
  result.removed = gone.length;

  return result;
}

module.exports = { fetchAllListings, contentHash, buildRow, syncListings };

if (require.main === module) {
  require("dotenv").config({ path: require("path").join(__dirname, "../../../../.env"), quiet: true });
  const { store } = require("./store");
  const usage = require("../usage");
  (async () => {
    const started = Date.now();
    const sources = await fetchAllListings();
    console.log(`Fetched ${sources.length} listings from Sharetribe`);
    const result = await syncListings({ store, sources, buildRow });
    const { costUsd, calls } = usage.stats();
    console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s:`, result, `Claude calls: ${calls.label}, ~$${costUsd.toFixed(3)}`);
    process.exit(result.failed ? 1 : 0);
  })().catch((error) => {
    console.error("Sync failed:", error);
    process.exit(1);
  });
}

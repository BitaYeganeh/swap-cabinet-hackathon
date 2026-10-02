const path = require("path");
const lancedb = require("@lancedb/lancedb");
const { Schema, Field, Utf8, Bool, Float32, FixedSizeList } = require("apache-arrow");

const DEFAULT_DIR = path.join(__dirname, "../../data/lancedb");
const TABLE = "listings";

const PHOTO_DIMS = 512; // CLIP image and text vectors share one space
const TEXT_DIMS = 384; // multilingual MiniLM

const vector = (name, dims) => new Field(name, new FixedSizeList(dims, new Field("item", new Float32(), true)), true);

const SCHEMA = new Schema([
  new Field("id", new Utf8(), true),
  new Field("title", new Utf8(), true),
  new Field("listing_type", new Utf8(), true),
  new Field("content_hash", new Utf8(), true),
  new Field("items", new Utf8(), true), // JSON: a bundle has several items
  new Field("has_photo", new Bool(), true),
  vector("photo_vector", PHOTO_DIMS),
  vector("clip_text_vector", PHOTO_DIMS),
  vector("text_vector", TEXT_DIMS),
]);

const toRecord = (row) => ({
  id: row.id,
  title: row.title,
  listing_type: row.listingType,
  content_hash: row.contentHash,
  items: JSON.stringify(row.items),
  has_photo: row.hasPhoto,
  photo_vector: row.photoVector,
  clip_text_vector: row.clipTextVector,
  text_vector: row.textVector,
});

// LanceDB returns Arrow vectors; callers get plain arrays.
const fromRecord = (record) => ({
  id: record.id,
  title: record.title,
  listingType: record.listing_type,
  contentHash: record.content_hash,
  items: JSON.parse(record.items),
  hasPhoto: record.has_photo,
  photoVector: Array.from(record.photo_vector),
  clipTextVector: Array.from(record.clip_text_vector),
  textVector: Array.from(record.text_vector),
});

const quote = (id) => `'${String(id).replace(/'/g, "''")}'`;

function createStore(dir = DEFAULT_DIR) {
  let tablePromise = null;

  const table = () => {
    tablePromise ??= (async () => {
      // `npm run sync` writes from a separate process. By default LanceDB never
      // re-checks the table, so a running server would keep serving the rows it
      // first opened (empty before the first sync). Check for new data every 5s.
      const db = await lancedb.connect(dir, { readConsistencyInterval: 5 });
      const names = await db.tableNames();
      return names.includes(TABLE) ? db.openTable(TABLE) : db.createEmptyTable(TABLE, SCHEMA);
    })().catch((error) => {
      tablePromise = null;
      throw error;
    });
    return tablePromise;
  };

  return {
    async upsert(rows) {
      if (!rows.length) return;
      await (await table()).mergeInsert("id").whenMatchedUpdateAll().whenNotMatchedInsertAll().execute(rows.map(toRecord));
    },

    async remove(ids) {
      if (!ids.length) return;
      await (await table()).delete(`id IN (${ids.map(quote).join(", ")})`);
    },

    async count() {
      return (await table()).countRows();
    },

    async all() {
      return (await (await table()).query().toArray()).map(fromRecord);
    },

    async searchText(vectorValue, limit) {
      const records = await (await table())
        .vectorSearch(vectorValue)
        .column("text_vector")
        .distanceType("cosine")
        .limit(limit)
        .toArray();
      return records.map((record) => ({ ...fromRecord(record), score: 1 - record._distance }));
    },
  };
}

let defaultStore = null;
const store = new Proxy({}, { get: (_, key) => (defaultStore ??= createStore())[key] });

module.exports = { createStore, store, PHOTO_DIMS, TEXT_DIMS };

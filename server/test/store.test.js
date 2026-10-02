const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createStore, PHOTO_DIMS, TEXT_DIMS } = require("../src/vectorStore/store");

const vec = (dims, hot) => Array.from({ length: dims }, (_, i) => (i === hot ? 1 : 0));
const row = (id, hot, over = {}) => ({
  id, title: `Title ${id}`, listingType: "sell-used-products", contentHash: `h-${id}`,
  items: [{ group: "shoes", kind: "boot" }], hasPhoto: true,
  photoVector: vec(PHOTO_DIMS, hot), clipTextVector: vec(PHOTO_DIMS, hot), textVector: vec(TEXT_DIMS, hot), ...over,
});

test("store round-trip: upsert, update, search, remove", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "store-"));
  const store = createStore(dir);

  assert.deepEqual(await store.all(), []);

  await store.upsert([row("a", 0), row("b", 1)]);
  await store.upsert([row("a", 0, { title: "Changed" })]);

  const all = await store.all();
  assert.equal(all.length, 2);
  const a = all.find((r) => r.id === "a");
  assert.equal(a.title, "Changed");
  assert.deepEqual(a.items, [{ group: "shoes", kind: "boot" }]);
  assert.ok(Array.isArray(a.photoVector));
  assert.equal(a.textVector.length, TEXT_DIMS);

  const hits = await store.searchText(vec(TEXT_DIMS, 1), 1);
  assert.equal(hits[0].id, "b");
  assert.ok(hits[0].score > 0.99);

  await store.remove(["b"]);
  assert.deepEqual((await store.all()).map((r) => r.id), ["a"]);

  // A second instance on the same folder sees the same data.
  assert.equal((await createStore(dir).all()).length, 1);
});

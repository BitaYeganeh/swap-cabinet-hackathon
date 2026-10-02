const test = require("node:test");
const assert = require("node:assert/strict");
const { syncListings, contentHash } = require("../src/vectorStore/sync");

function fakeStore(rows = []) {
  const data = new Map(rows.map((r) => [r.id, r]));
  return {
    data,
    all: async () => [...data.values()],
    upsert: async (list) => list.forEach((r) => data.set(r.id, r)),
    remove: async (ids) => ids.forEach((id) => data.delete(id)),
  };
}

const source = (id, title = id) => ({ id, title, description: "", imageIds: [] });

test("contentHash changes when the listing changes", () => {
  assert.equal(contentHash(source("a")), contentHash(source("a")));
  assert.notEqual(contentHash(source("a")), contentHash(source("a", "new title")));
});

test("sync adds new, updates changed, skips unchanged, removes gone", async () => {
  const unchanged = source("keep");
  const store = fakeStore([
    { id: "keep", contentHash: contentHash(unchanged) },
    { id: "edit", contentHash: "old" },
    { id: "sold", contentHash: "x" },
  ]);
  const built = [];
  const buildRow = async (s) => {
    built.push(s.id);
    return { id: s.id, contentHash: contentHash(s) };
  };

  const result = await syncListings({
    store,
    sources: [unchanged, source("edit"), source("new")],
    buildRow,
    log: () => {},
  });

  assert.deepEqual(built.sort(), ["edit", "new"]);
  assert.deepEqual(result, { added: 1, updated: 1, unchanged: 1, removed: 1, failed: 0 });
  assert.deepEqual([...store.data.keys()].sort(), ["edit", "keep", "new"]);
});

test("an empty fetch does not wipe the store", async () => {
  const store = fakeStore([{ id: "a", contentHash: "x" }]);
  const logs = [];
  const result = await syncListings({ store, sources: [], buildRow: async () => ({}), log: (m) => logs.push(m) });
  assert.equal(result.removed, 0);
  assert.deepEqual([...store.data.keys()], ["a"]);
  assert.match(logs.join("\n"), /not removing anything/);
});

test("a listing that fails to build is reported and retried next time", async () => {
  const store = fakeStore();
  const result = await syncListings({
    store,
    sources: [source("bad"), source("good")],
    buildRow: async (s) => {
      if (s.id === "bad") throw new Error("boom");
      return { id: s.id, contentHash: contentHash(s) };
    },
    log: () => {},
  });
  assert.equal(result.failed, 1);
  assert.deepEqual([...store.data.keys()], ["good"]);
});

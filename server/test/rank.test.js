const test = require("node:test");
const assert = require("node:assert/strict");
const { groupFor, labelOverlap, rankPhotoSearch } = require("../src/vectorStore/rank");

const item = (over) => ({
  group: "shoes", kind: "hi-top sneaker", brand: null, model: null,
  style: "casual", material: "canvas", pattern: "plain", details: ["laces"], color: "black", ...over,
});
const row = (id, items, vector, over = {}) => ({
  id, title: id, listingType: "sell-used-products", items, hasPhoto: true,
  photoVector: vector, clipTextVector: [0, 0, 1], textVector: [], ...over,
});

test("same product needs kind, brand and model", () => {
  const q = item({ brand: "converse", model: "chuck 70" });
  assert.equal(groupFor(q, [item({ brand: "converse", model: "chuck 70", color: "white" })]), "same");
  assert.equal(groupFor(q, [item({ brand: "converse", model: null })]), "exact");
  assert.equal(groupFor(item(), [item({ brand: "converse", model: "chuck 70" })]), "exact");
});

test("same group but other kind is close, other group is other", () => {
  assert.equal(groupFor(item(), [item({ kind: "boot" })]), "close");
  assert.equal(groupFor(item(), [item({ group: "tops", kind: "sweater" })]), "other");
});

test("other-kinds never count as the same kind", () => {
  const q = item({ kind: "other-shoes" });
  assert.equal(groupFor(q, [item({ kind: "other-shoes" })]), "close");
});

test("a bundle takes the best group of its items", () => {
  assert.equal(groupFor(item(), [item({ group: "tops", kind: "sweater" }), item()]), "exact");
});

test("color does not change the group", () => {
  assert.equal(groupFor(item({ color: "black" }), [item({ color: "red" })]), "exact");
});

test("labelOverlap counts style, material, pattern and details", () => {
  assert.equal(labelOverlap(item(), [item()]), 1);
  assert.equal(labelOverlap(item(), [item({ style: "formal", material: "leather", pattern: "striped", details: [] })]), 0);
  assert.equal(labelOverlap(item(), [item({ style: "formal", material: "leather" })]), 0.5);
});

test("rankPhotoSearch groups, orders and splits off wanted listings", () => {
  const q = item();
  const rows = [
    row("boot", [item({ kind: "boot" })], [1, 0, 0]),
    row("sneaker-far", [item()], [0, 1, 0]),
    row("sneaker-near", [item()], [1, 0, 0]),
    row("sweater", [item({ group: "tops", kind: "sweater" })], [1, 0, 0]),
    row("wanted-sneaker", [item()], [1, 0, 0], { listingType: "in-search-of-clothing" }),
    row("no-photo-sneaker", [item()], [0, 0, 0], { hasPhoto: false, clipTextVector: [1, 0, 0] }),
  ];
  const { groups, wanted } = rankPhotoSearch({ queryItem: q, queryVector: [1, 0, 0], rows });

  assert.deepEqual(groups.map((g) => g.key), ["exact", "close", "other"]);
  assert.deepEqual(groups[0].ids.map((x) => x.id).sort(), ["no-photo-sneaker", "sneaker-far", "sneaker-near"]);
  assert.equal(groups[0].ids[2].id, "sneaker-far");
  assert.deepEqual(groups[1].ids.map((x) => x.id), ["boot"]);
  assert.deepEqual(groups[2].ids.map((x) => x.id), ["sweater"]);
  assert.deepEqual(wanted.map((x) => x.id), ["wanted-sneaker"]);
});

test("fallback without labels gives one list by similarity", () => {
  const rows = [row("a", [item()], [0, 1, 0]), row("b", [item()], [1, 0, 0])];
  const { groups } = rankPhotoSearch({ queryItem: null, queryVector: [1, 0, 0], rows });
  assert.deepEqual(groups.map((g) => g.key), ["closest"]);
  assert.deepEqual(groups[0].ids.map((x) => x.id), ["b", "a"]);
});

test("a general kind in the photo finds the specific kind in a listing as exact", () => {
  assert.equal(groupFor(item({ kind: "boot" }), [item({ kind: "work boot" })]), "exact");
  assert.equal(groupFor(item({ kind: "work boot" }), [item({ kind: "ankle boot" })]), "close");
});

const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../src/vectorStore/vocabulary");

test("every kind maps to a known group", () => {
  for (const kind of V.KINDS) assert.ok(V.GROUPS.includes(V.groupOf(kind)), kind);
});

test("kinds are unique", () => {
  const all = Object.values(V.KINDS_BY_GROUP).flat();
  assert.equal(new Set(all).size, all.length);
});

test("each group has an other-kind", () => {
  for (const group of V.GROUPS) {
    assert.ok(V.KINDS.includes(`other-${group}`));
    assert.equal(V.groupOf(`other-${group}`), group);
    assert.equal(V.isOtherKind(`other-${group}`), true);
  }
  assert.equal(V.isOtherKind("hi-top sneaker"), false);
});

test("examples land in the expected group", () => {
  assert.equal(V.groupOf("hi-top sneaker"), "shoes");
  assert.equal(V.groupOf("bomber jacket"), "outerwear");
  assert.equal(V.groupOf("jeans"), "bottoms");
});

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

test("a general kind matches its specific kinds, but specific kinds don't match each other", () => {
  assert.equal(V.kindsMatch("boot", "work boot"), true);
  assert.equal(V.kindsMatch("ankle boot", "boot"), true);
  assert.equal(V.kindsMatch("jacket", "bomber jacket"), true);
  assert.equal(V.kindsMatch("shorts", "denim shorts"), true);
  assert.equal(V.kindsMatch("dress", "shirt dress"), true);
  assert.equal(V.kindsMatch("boot", "boot"), true);
  assert.equal(V.kindsMatch("work boot", "ankle boot"), false);
  assert.equal(V.kindsMatch("denim jacket", "bomber jacket"), false);
  assert.equal(V.kindsMatch("boot", "hi-top sneaker"), false);
  assert.equal(V.kindsMatch("other-shoes", "other-shoes"), false);
});

test("every parent kind and child kind is a real kind", () => {
  for (const [child, parent] of Object.entries(V.PARENT_KIND)) {
    assert.ok(V.KINDS.includes(child), child);
    assert.ok(V.KINDS.includes(parent), parent);
    assert.equal(V.groupOf(child), V.groupOf(parent), child);
  }
});

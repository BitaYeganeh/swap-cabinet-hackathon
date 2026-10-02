const test = require("node:test");
const assert = require("node:assert/strict");
const { createSemantic } = require("../src/vectorStore/semantic");

test("empty store returns no meaning matches without loading the model", async () => {
  let loaded = false;
  const { similarIds } = createSemantic({
    store: { count: async () => 0 },
    textVector: async () => {
      loaded = true;
      return [];
    },
  });
  assert.deepEqual(await similarIds("jacket"), []);
  assert.equal(loaded, false);
});

test("non-empty store returns ids above the score cutoff", async () => {
  const { similarIds } = createSemantic({
    store: { count: async () => 2, searchText: async () => [{ id: "a", score: 0.9 }, { id: "b", score: 0.1 }] },
    textVector: async () => [0],
  });
  assert.deepEqual(await similarIds("jacket"), ["a"]);
});

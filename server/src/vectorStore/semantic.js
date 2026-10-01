const { store } = require("./store");
const { textVector } = require("./embed");
const { itemsText } = require("./items");

// Closest listings by meaning. The text search only ever adds these to its
// keyword results, so a missing or empty store just means "no additions".
async function similarIds(text, { limit = 20, minScore = 0.45 } = {}) {
  try {
    const hits = await store.searchText(await textVector(text), limit);
    return hits.filter((hit) => hit.score >= minScore).map((hit) => hit.id);
  } catch (error) {
    console.error("Meaning search unavailable:", error.message);
    return [];
  }
}

async function labelsById(ids) {
  try {
    const wanted = new Set(ids);
    const rows = (await store.all()).filter((row) => wanted.has(row.id));
    return new Map(rows.map((row) => [row.id, itemsText(row.items)]));
  } catch (error) {
    console.error("Labels unavailable:", error.message);
    return new Map();
  }
}

module.exports = { similarIds, labelsById };

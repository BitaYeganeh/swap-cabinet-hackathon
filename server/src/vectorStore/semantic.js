const { store: defaultStore } = require("./store");
const embed = require("./embed");
const { itemsText } = require("./items");

const MEANING_TIMEOUT_MS = 2000;

// Closest listings by meaning. The text search only ever adds these to its
// keyword results, so a missing or empty store, or a slow model, just means
// "no additions".
function createSemantic({ store = defaultStore, textVector = (text) => embed.textVector(text) } = {}) {
  let hasRows = false;

  async function work(text, limit, minScore) {
    if (!hasRows) {
      if ((await store.count()) === 0) return [];
      hasRows = true;
    }
    const hits = await store.searchText(await textVector(text), limit);
    return hits.filter((hit) => hit.score >= minScore).map((hit) => hit.id);
  }

  // 0.52: below it hits are loose associations ("socks" -> sneakers, mittens at
  // ~0.46-0.50); real meaning matches ("winter boots" -> boots) score 0.53+.
  async function similarIds(text, { limit = 20, minScore = 0.52 } = {}) {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        console.error("Meaning search timed out, using keyword results only");
        resolve([]);
      }, MEANING_TIMEOUT_MS);
    });
    try {
      return await Promise.race([work(text, limit, minScore), timeout]);
    } catch (error) {
      console.error("Meaning search unavailable:", error.message);
      return [];
    } finally {
      clearTimeout(timer);
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

  return { similarIds, labelsById };
}

module.exports = { ...createSemantic(), createSemantic, MEANING_TIMEOUT_MS };

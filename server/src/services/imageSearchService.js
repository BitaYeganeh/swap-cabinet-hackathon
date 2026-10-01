const { labelPhoto } = require("../vectorStore/labels");
const { imageVector } = require("../vectorStore/embed");
const { store } = require("../vectorStore/store");
const { rankPhotoSearch } = require("../vectorStore/rank");
const { getListingsByIds } = require("./listingService");
const usage = require("./aiUsage");

class ImageSearchError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function searchByPhoto(buffer, mediaType) {
  if (usage.overBudget()) throw new ImageSearchError("Photo search has reached today's limit, try again tomorrow", 503);

  const started = Date.now();
  // Labels and vector in parallel. Claude failing is not fatal: we still rank by looks.
  const [labelResult, queryVector, rows] = await Promise.all([
    labelPhoto(buffer, mediaType).then(
      (items) => ({ items }),
      (error) => {
        console.error("Photo labelling failed, ranking by looks only:", error.message);
        return { items: null };
      }
    ),
    imageVector(buffer),
    store.all(),
  ]);

  if (labelResult.items && labelResult.items.length === 0) {
    return { labels: null, fallback: false, noClothing: true, groups: [], wanted: [] };
  }

  const queryItem = labelResult.items ? labelResult.items[0] : null;
  const ranked = rankPhotoSearch({ queryItem, queryVector, rows });

  const ids = [...ranked.groups.flatMap((g) => g.ids), ...ranked.wanted].map((x) => x.id);
  const listings = await getListingsByIds(ids);
  const resolve = (list) => list.map((x) => listings.get(x.id)).filter(Boolean);

  console.log(
    `Photo search -> ${queryItem ? queryItem.kind : "no labels"}:`,
    ranked.groups.map((g) => `${g.key} ${g.ids.length}`).join(", "),
    `[${Date.now() - started}ms]`
  );

  return {
    labels: queryItem,
    fallback: !queryItem,
    noClothing: false,
    groups: ranked.groups.map((g) => ({ key: g.key, listings: resolve(g.ids) })).filter((g) => g.listings.length),
    wanted: resolve(ranked.wanted),
  };
}

module.exports = { searchByPhoto, ImageSearchError };

// Accuracy guard: the new search must still return every listing the old one did.
// Run from server/:  node scripts/compareSearch.js baseline   (before the change)
//                    node scripts/compareSearch.js check      (after the change)
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { getListings } = require("../src/services/listingService");

const FILE = path.join(__dirname, "searchBaseline.json");
const QUERIES = ["jacket", "boots", "sneakers", "jeans", "sweater", "wool", "leather", "dress", "kids", "denim shorts", "belt", "vintage", "takki", "warm"];

async function allIds(keywords) {
  const ids = [];
  for (let page = 1; ; page++) {
    const { listings, pagination } = await getListings({ keywords, page });
    ids.push(...listings.map((l) => l.id));
    if (page >= pagination.totalPages) return ids;
  }
}

(async () => {
  const mode = process.argv[2];
  const results = {};
  for (const q of QUERIES) results[q] = await allIds(q);

  if (mode === "baseline") {
    fs.writeFileSync(FILE, JSON.stringify(results, null, 2));
    console.log("Baseline saved:", Object.entries(results).map(([q, ids]) => `${q}=${ids.length}`).join(" "));
    process.exit(0);
  }

  const baseline = JSON.parse(fs.readFileSync(FILE, "utf8"));
  let missing = 0;
  for (const q of QUERIES) {
    const now = new Set(results[q]);
    const lost = (baseline[q] || []).filter((id) => !now.has(id));
    missing += lost.length;
    console.log(`${lost.length ? "LOST" : "ok  "} "${q}": before ${baseline[q]?.length ?? 0}, now ${now.size}${lost.length ? `, missing ${lost.join(",")}` : ""}`);
  }
  process.exit(missing ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

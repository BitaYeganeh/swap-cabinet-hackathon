// Accuracy, speed and cost check for our search against hand-picked right answers.
// Run from server/:  node scripts/evalAiSearch.js [--details]
// Writes the tables to scripts/evalReport.md.
//
// Each query in evalQueries.json runs through three searches:
//   before   = Sharetribe's own keyword search (what the marketplace has today)
//   smart    = our keyword search (typo-tolerant + meaning-based matches), no AI
//   ai       = our AI search (Claude turns the text into filters / picks items)
// Scores:
//   recall    = right listings found / right listings that exist  (missed items hurt this)
//   precision = right listings found / listings shown             (wrong items hurt this)
//   top 12    = right listings on the first results page (12 cards) / right listings, max 12
// "Looking for ..." listings are buyers' wanted ads, so they never count as right.
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const sharetribe = require("../src/config/sharetribe");
const { interpretSearch } = require("../src/services/aiSearchService");
const { getListings } = require("../src/services/listingService");
const usage = require("../src/services/aiUsage");
const QUERIES = require("./evalQueries.json");

const PAGE_SIZE = 12;
const REPORT = path.join(__dirname, "evalReport.md");
const verbose = process.argv.includes("--details");

async function allListings(filters) {
  const listings = [];
  for (let page = 1; ; page++) {
    const result = await getListings({ ...filters, page });
    listings.push(...result.listings);
    if (page >= result.pagination.totalPages) return listings;
  }
}

async function sharetribeKeywordSearch(keywords) {
  const listings = [];
  for (let page = 1; ; page++) {
    const response = await sharetribe.listings.query({ keywords, perPage: 100, page });
    listings.push(...response.data.data.map((l) => ({ id: l.id.uuid, title: l.attributes.title })));
    if (page >= response.data.meta.totalPages) return listings;
  }
}

async function timed(work) {
  const started = performance.now();
  const value = await work();
  return { value, ms: performance.now() - started };
}

function score(expected, listings) {
  const right = new Set(expected.map((e) => e.id));
  const ids = [...new Set(listings.map((l) => l.id))];
  const hits = ids.filter((id) => right.has(id)).length;
  const topHits = ids.slice(0, PAGE_SIZE).filter((id) => right.has(id)).length;
  return {
    recall: right.size ? hits / right.size : 1,
    precision: ids.length ? hits / ids.length : 0,
    top: topHits / Math.min(right.size, PAGE_SIZE),
    shown: ids.length,
    missed: expected.filter((e) => !ids.includes(e.id)).map((e) => e.title),
    wrong: listings.filter((l) => !right.has(l.id)).map((l) => l.title),
  };
}

const pct = (n) => `${Math.round(n * 100)}%`;
const sec = (ms) => `${(ms / 1000).toFixed(2)} s`;
const usd = (n) => `$${n.toFixed(4)}`;
const avg = (rows, pick) => rows.reduce((sum, r) => sum + pick(r), 0) / rows.length;
const table = (head, rows) =>
  [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

(async () => {
  // Warm-up: load the embedding model and the listing cache so the first query isn't penalised.
  await allListings({ keywords: "warm-up" });

  const rows = [];
  for (const { query, why, expected } of QUERIES) {
    const before = await timed(() => sharetribeKeywordSearch(query));
    const smart = await timed(() => allListings({ keywords: query }));

    const spentBefore = structuredClone(usage.stats());
    const ai = await timed(async () => {
      const result = await interpretSearch(query);
      return { result, listings: await allListings(result.filters) };
    });
    const spentAfter = structuredClone(usage.stats());
    const aiRepeat = await timed(async () => allListings((await interpretSearch(query)).filters));

    const tokens = (s) => s.tokens.input + s.tokens.cacheWrite + s.tokens.cacheRead;
    const row = {
      query,
      why,
      expected: expected.length,
      before: { ...score(expected, before.value), ms: before.ms },
      smart: { ...score(expected, smart.value), ms: smart.ms },
      ai: {
        ...score(expected, ai.value.listings),
        ms: ai.ms,
        repeatMs: aiRepeat.ms,
        cost: spentAfter.costUsd - spentBefore.costUsd,
        calls: Object.values(spentAfter.calls).reduce((a, b) => a + b, 0) - Object.values(spentBefore.calls).reduce((a, b) => a + b, 0),
        tokensIn: tokens(spentAfter) - tokens(spentBefore),
        tokensOut: spentAfter.tokens.output - spentBefore.tokens.output,
        mode: ai.value.result.picks?.length ? "AI picks" : "AI filters",
        filters: ai.value.result.filters,
      },
    };
    rows.push(row);

    console.log(
      `${query.padEnd(38)} before ${pct(row.before.recall).padStart(4)}  smart ${pct(row.smart.recall).padStart(4)}  ai ${pct(row.ai.recall).padStart(4)}  ${sec(row.ai.ms)}  ${usd(row.ai.cost)}`
    );
    if (verbose) {
      console.log("   AI filters:", JSON.stringify(row.ai.filters));
      if (row.ai.missed.length) console.log("   AI missed:", row.ai.missed.join("; "));
      if (row.ai.wrong.length) console.log("   AI extra: ", row.ai.wrong.join("; "));
    }
  }

  const methods = [
    ["Before: Sharetribe keyword search", "before"],
    ["Our smart keyword search (no AI)", "smart"],
    ["Our AI search", "ai"],
  ];
  const needs = rows.filter((r) => r.why === "vague need");

  const md = [
    `# Search accuracy, speed and cost`,
    ``,
    `Run on ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC against the live marketplace. ${QUERIES.length} test searches, right answers picked by hand from all listings.`,
    `Model: Claude Opus 5.5 ($4 in / $20 out per million tokens).`,
    ``,
    `## Summary (average over all searches)`,
    ``,
    table(
      ["Search", "Recall (found all right items)", "Precision (shown items are right)", "Right items on first page", "Time per search"],
      methods.map(([name, key]) => [
        name,
        pct(avg(rows, (r) => r[key].recall)),
        pct(avg(rows, (r) => r[key].precision)),
        pct(avg(rows, (r) => r[key].top)),
        sec(avg(rows, (r) => r[key].ms)),
      ])
    ),
    ``,
    `## Vague needs only (${needs.length} searches)`,
    ``,
    table(
      ["Search", "Recall", "Precision", "Right items on first page"],
      methods.map(([name, key]) => [name, pct(avg(needs, (r) => r[key].recall)), pct(avg(needs, (r) => r[key].precision)), pct(avg(needs, (r) => r[key].top))])
    ),
    ``,
    `## Accuracy per search (recall / precision / items shown)`,
    ``,
    table(
      ["Search", "Type", "Right items", "Before (Sharetribe)", "Smart (no AI)", "AI"],
      rows.map((r) => [
        `"${r.query}"`,
        r.why,
        r.expected,
        ...["before", "smart", "ai"].map((k) => `${pct(r[k].recall)} / ${pct(r[k].precision)} / ${r[k].shown}`),
      ])
    ),
    ``,
    `## AI cost and time per search`,
    ``,
    table(
      ["Search", "AI mode", "Claude calls", "Tokens in", "Tokens out", "Cost", "Time (first)", "Time (repeat, cached)"],
      rows.map((r) => [`"${r.query}"`, r.ai.mode, r.ai.calls, r.ai.tokensIn, r.ai.tokensOut, usd(r.ai.cost), sec(r.ai.ms), sec(r.ai.repeatMs)])
    ),
    ``,
    `**Average AI search:** ${usd(avg(rows, (r) => r.ai.cost))} and ${sec(avg(rows, (r) => r.ai.ms))} the first time, ${sec(avg(rows, (r) => r.ai.repeatMs))} when the same search is repeated (cached).`,
    `**Per 1,000 searches (no cache hits):** about ${usd(avg(rows, (r) => r.ai.cost) * 1000)}.`,
    ``,
    `## What the AI missed`,
    ``,
    ...rows.filter((r) => r.ai.missed.length).map((r) => `- "${r.query}": ${r.ai.missed.join("; ")}`),
    ``,
  ].join("\n");

  fs.writeFileSync(REPORT, md);
  console.log(`\nReport written to ${path.relative(process.cwd(), REPORT)}`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Tracks AI token usage and estimated spend for the current day (UTC), and
// enforces a daily budget so a traffic spike can't run up an unbounded bill.

// Claude Opus 5.5 prices, USD per million tokens.
const PRICE_PER_MTOK = {
  input: 4,
  output: 20,
  cacheWrite: 5, // 1.25x input, 5-minute cache
  cacheRead: 0.2,
};

const DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD) || 5;

const today = () => new Date().toISOString().slice(0, 10);

let day = today();
let totals = emptyTotals();

function emptyTotals() {
  return {
    searches: 0,
    cacheHits: 0,
    calls: { understand: 0, pick: 0, label: 0 },
    tokens: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
    costUsd: 0,
  };
}

// Start fresh at midnight UTC.
function rollOver() {
  if (day !== today()) {
    day = today();
    totals = emptyTotals();
  }
}

function costOf(usage) {
  const tokens = {
    input: usage.input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
  };
  const cost = Object.entries(tokens).reduce((sum, [kind, n]) => sum + (n * PRICE_PER_MTOK[kind]) / 1e6, 0);
  return { tokens, cost };
}

/** Record one Claude call; returns its estimated cost in USD. */
function recordCall(kind, usage) {
  rollOver();
  const { tokens, cost } = costOf(usage);
  totals.calls[kind] += 1;
  for (const [k, n] of Object.entries(tokens)) totals.tokens[k] += n;
  totals.costUsd += cost;
  return cost;
}

function recordSearch({ cached }) {
  rollOver();
  totals.searches += 1;
  if (cached) totals.cacheHits += 1;
}

function overBudget() {
  rollOver();
  return totals.costUsd >= DAILY_BUDGET_USD;
}

function stats() {
  rollOver();
  return {
    day,
    ...totals,
    costUsd: Math.round(totals.costUsd * 10000) / 10000,
    budgetUsd: DAILY_BUDGET_USD,
  };
}

module.exports = { recordCall, recordSearch, overBudget, stats };

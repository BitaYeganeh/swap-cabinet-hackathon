const { kindsMatch, WANTED_TYPE } = require("./vocabulary");

const GROUP_ORDER = ["same", "exact", "close", "other"];

// Order inside a group: how alike the photos look, plus matching labels.
const PHOTO_WEIGHT = 0.7;
const LABEL_WEIGHT = 0.3;

const dot = (a, b) => a.reduce((sum, x, i) => sum + x * (b[i] ?? 0), 0);

function groupOfItem(q, item) {
  const sameKind = kindsMatch(q.kind, item.kind);
  if (sameKind && q.brand && q.model && q.brand === item.brand && q.model === item.model) return "same";
  if (sameKind) return "exact";
  if (q.group === item.group) return "close";
  return "other";
}

// A bundle is as good as its best item.
function groupFor(queryItem, listingItems) {
  const ranks = listingItems.map((item) => GROUP_ORDER.indexOf(groupOfItem(queryItem, item)));
  return GROUP_ORDER[Math.min(GROUP_ORDER.length - 1, ...ranks)];
}

// Share of the query's labels the listing matches (style, material, pattern,
// any detail). Color is left out on purpose.
function overlapOfItem(q, item) {
  const checks = [];
  for (const key of ["style", "material", "pattern"]) if (q[key]) checks.push(q[key] === item[key]);
  if (q.details.length) checks.push(q.details.some((d) => item.details.includes(d)));
  return checks.length ? checks.filter(Boolean).length / checks.length : 0;
}

function labelOverlap(queryItem, listingItems) {
  return Math.max(0, ...listingItems.map((item) => overlapOfItem(queryItem, item)));
}

// Listings without a photo are compared through CLIP's text side.
const similarity = (queryVector, row) => dot(queryVector, row.hasPhoto ? row.photoVector : row.clipTextVector);

const byScore = (a, b) => b.score - a.score;

function rankPhotoSearch({ queryItem, queryVector, rows }) {
  if (!queryItem) {
    const ids = rows
      .filter((row) => row.listingType !== WANTED_TYPE)
      .map((row) => ({ id: row.id, score: similarity(queryVector, row) }))
      .sort(byScore);
    return { groups: ids.length ? [{ key: "closest", ids }] : [], wanted: [] };
  }

  const buckets = Object.fromEntries(GROUP_ORDER.map((key) => [key, []]));
  const wanted = [];

  for (const row of rows) {
    const group = groupFor(queryItem, row.items);
    const score = PHOTO_WEIGHT * similarity(queryVector, row) + LABEL_WEIGHT * labelOverlap(queryItem, row.items);
    if (row.listingType === WANTED_TYPE) {
      if (group !== "other") wanted.push({ id: row.id, score });
    } else {
      buckets[group].push({ id: row.id, score });
    }
  }

  const groups = GROUP_ORDER.filter((key) => buckets[key].length).map((key) => ({ key, ids: buckets[key].sort(byScore) }));
  return { groups, wanted: wanted.sort(byScore) };
}

module.exports = { GROUP_ORDER, groupFor, labelOverlap, rankPhotoSearch };

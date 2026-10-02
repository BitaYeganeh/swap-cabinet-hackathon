const { groupOf } = require("./vocabulary");

const MAX_DETAILS = 4;

const clean = (value) => {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  return text || null;
};

// Claude's raw items -> the shape stored and compared everywhere.
function normalizeItems(rawItems) {
  return rawItems.map((item) => ({
    group: groupOf(item.kind),
    kind: item.kind,
    brand: clean(item.brand),
    model: clean(item.model),
    style: item.style ?? null,
    material: item.material ?? null,
    pattern: item.pattern ?? null,
    details: (item.details || []).map(clean).filter(Boolean).slice(0, MAX_DETAILS),
    color: clean(item.color),
  }));
}

// What the seller typed beats what Claude read. Only for single-item listings:
// in a bundle we can't tell which item the seller's brand belongs to.
function applySellerFields(items, { brand, color } = {}) {
  if (items.length !== 1) return items;
  const [item] = items;
  return [{ ...item, brand: clean(brand) ?? item.brand, color: clean(color) ?? item.color }];
}

// Labels as plain text, for the text vector.
function itemsText(items) {
  return items
    .map((item) =>
      [item.kind, [item.brand, item.model].filter(Boolean).join(" "), item.material, item.style, item.pattern, ...item.details]
        .filter(Boolean)
        .join(", ")
    )
    .join("; ");
}

module.exports = { normalizeItems, applySellerFields, itemsText };

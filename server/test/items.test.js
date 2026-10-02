const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeItems, applySellerFields, itemsText } = require("../src/vectorStore/items");

const raw = {
  kind: "hi-top sneaker", brand: " Converse ", model: "Chuck 70", style: "casual",
  material: "canvas", pattern: "plain", details: ["Laces", "rubber toe", "x", "y", "z"], color: "Black",
};

test("normalizeItems adds the group and cleans values", () => {
  const [item] = normalizeItems([raw]);
  assert.equal(item.group, "shoes");
  assert.equal(item.brand, "converse");
  assert.equal(item.model, "chuck 70");
  assert.equal(item.color, "black");
  assert.deepEqual(item.details, ["laces", "rubber toe", "x", "y"]);
});

test("normalizeItems turns empty strings into null", () => {
  const [item] = normalizeItems([{ ...raw, brand: "  ", model: null }]);
  assert.equal(item.brand, null);
  assert.equal(item.model, null);
});

test("seller brand and color win for a single item", () => {
  const items = applySellerFields(normalizeItems([{ ...raw, brand: null }]), { brand: "Acne Studios", color: "multicolor" });
  assert.equal(items[0].brand, "acne studios");
  assert.equal(items[0].color, "multicolor");
});

test("seller fields are not spread over a bundle", () => {
  const items = applySellerFields(normalizeItems([raw, { ...raw, kind: "jeans" }]), { brand: "Acne Studios" });
  assert.equal(items[0].brand, "converse");
});

test("itemsText lists the useful labels", () => {
  assert.equal(itemsText(normalizeItems([raw])), "hi-top sneaker, converse chuck 70, canvas, casual, plain, laces, rubber toe, x, y");
});

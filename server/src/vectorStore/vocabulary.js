// The only label values Claude may use, so labels from listings and from a
// buyer's photo can be compared exactly ("high top" and "korkeavartiset" both
// become "hi-top sneaker").

const KINDS_BY_GROUP = {
  tops: ["t-shirt", "long-sleeve top", "shirt", "blouse", "sweater", "turtleneck", "cardigan", "hoodie", "sweatshirt", "tank top", "poncho"],
  outerwear: ["jacket", "denim jacket", "bomber jacket", "leather jacket", "winter jacket", "coat", "raincoat", "blazer", "vest"],
  dresses: ["dress", "shirt dress", "jumpsuit"],
  bottoms: ["jeans", "trousers", "shorts", "denim shorts", "skirt", "leggings"],
  shoes: ["hi-top sneaker", "low sneaker", "boot", "ankle boot", "work boot", "sandal", "flip-flop", "dress shoe", "heel", "loafer"],
  bags: ["handbag", "backpack", "tote bag", "shoulder bag"],
  accessories: ["belt", "sunglasses", "tie", "hat", "scarf", "gloves", "jewelry"],
};

const GROUPS = Object.keys(KINDS_BY_GROUP);

// "other-shoes" etc.: Claude's answer when no listed kind fits. It still gives
// the group, but never counts as the same kind as anything.
const KIND_TO_GROUP = new Map(
  GROUPS.flatMap((group) => [...KINDS_BY_GROUP[group], `other-${group}`].map((kind) => [kind, group]))
);

const KINDS = [...KIND_TO_GROUP.keys()];

const STYLES = ["casual", "vintage", "sporty", "formal", "streetwear", "workwear", "bohemian", "classic"];
const MATERIALS = ["cotton", "denim", "leather", "suede", "wool", "knit", "canvas", "linen", "silk", "synthetic", "rubber", "other"];
const PATTERNS = ["plain", "striped", "checked", "floral", "printed", "other"];

const WANTED_TYPE = "in-search-of-clothing";

const groupOf = (kind) => KIND_TO_GROUP.get(kind);
const isOtherKind = (kind) => kind.startsWith("other-");

module.exports = { GROUPS, KINDS, KINDS_BY_GROUP, STYLES, MATERIALS, PATTERNS, WANTED_TYPE, groupOf, isOtherKind };

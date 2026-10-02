// Filter values the marketplace understands. Shared by the listing search and
// the AI search so both speak exactly the same vocabulary.

const CATEGORIES = ["women", "men", "kids"];

// Stored in Sharetribe as categoryLevel2 = "<category>-<type>".
const TYPES = ["tops", "bottoms", "shoes", "accessories", "bundles"];

// Only kids listings are split by gender.
const GENDERS = ["boys", "girls"];

const COLORS = [
  "black",
  "white",
  "grey",
  "silver",
  "brown",
  "bronze",
  "red",
  "pink",
  "orange",
  "yellow",
  "green",
  "blue",
  "multicolor",
];

const CONDITIONS = ["like-new", "gently-used", "well-used", "heavily-used"];

const SORTS = ["newest", "price-asc", "price-desc"];

const LETTER_SIZES = ["xs", "s", "m", "l", "xl", "xxl"];

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

// EU shoe sizes: kids 18–35, adults 35–47.
const SHOE_SIZES = range(18, 47);

const KIDS_AGES = ["3m", "6m", "9m", "12m", "18m", ...range(2, 14).map((n) => `${n}y`)];

// Size filter values: "m" (clothing), "shoe-38" (EU shoe size), "kids-5y" (kids' age).
const SIZE_FILTERS = [
  ...LETTER_SIZES,
  ...SHOE_SIZES.map((eu) => `shoe-${eu}`),
  ...KIDS_AGES.map((age) => `kids-${age}`),
];

module.exports = {
  CATEGORIES,
  TYPES,
  GENDERS,
  COLORS,
  CONDITIONS,
  SORTS,
  LETTER_SIZES,
  KIDS_AGES,
  SIZE_FILTERS,
};

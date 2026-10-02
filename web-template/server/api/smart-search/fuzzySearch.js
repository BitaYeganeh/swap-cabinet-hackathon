// Typo-tolerant, field-weighted keyword search over already-mapped listings.
//
// "jakcet" -> jacket (transposition), "levi" -> levis (prefix),
// "sneekers" -> sneakers (edit distance), "tee" -> t-shirt (synonym),
// "helsnki" -> Helsinki, "005" -> postcodes 00510 and 00530 (location),
// "esbo"/"helsingfors" -> Espoo/Helsinki (alias), "flemingin katu" -> Fleminginkatu,
// "puuvilla" -> cotton, "cotton" also finds denim (material), "autumn clothes" ->
// wool sweaters, jackets, boots... (season).

// Higher weight = a hit in this field counts for more when ranking.
const FIELD_WEIGHTS = {
  title: 3,
  brand: 2.5,
  category: 2,
  subcategory: 2,
  color: 2,
  material: 1.5,
  condition: 1,
  city: 2.5,
  postcode: 2.5,
  street: 1.5,
  country: 1,
  description: 1,
};

// Fields describing where a listing is, rather than what it is.
const LOCATION_FIELDS = ["postcode", "city", "street", "country"];

const STOPWORDS = new Set(["a", "an", "and", "the", "for", "with", "in", "of", "on", "to", "or"]);

// Words that mean "any item": "autumn clothes" searches autumn, "clothes" alone shows everything.
const GENERIC_WORDS = new Set([
  "clothes", "clothing", "wear", "outfit", "outfits", "garment", "garments", "apparel",
  "item", "items", "stuff", "things", "vaatteet", "vaate", "vaatetta",
]);

// Groups of words treated as interchangeable. Every word in a group expands to the others.
const SYNONYM_GROUPS = [
  ["tshirt", "tee", "top", "shirt"],
  ["sneakers", "trainers", "shoes", "sneaker", "trainer", "footwear", "kicks"],
  ["hoodie", "hoody", "sweatshirt"],
  ["sweater", "jumper", "pullover", "knit", "cardigan"],
  ["pants", "trousers", "jeans", "chinos", "slacks", "joggers", "sweatpants"],
  ["jacket", "coat", "parka", "blazer", "outerwear", "anorak"],
  ["dress", "gown", "frock"],
  ["bag", "handbag", "purse", "backpack", "tote"],
  ["kids", "children", "child", "baby", "toddler", "boy", "boys", "girl", "girls", "junior", "youth", "infant", "teen", "teens"],
  ["women", "womens", "ladies", "woman", "lady", "female"],
  ["men", "mens", "man", "male", "gents", "gentlemen"],
  ["bundle", "bundles", "set", "lot", "pack", "collection"],
  ["accessories", "accessory"],
  ["bottoms", "bottom"],
  ["tops"],
  ["multicolor", "multicolour", "colorful", "colourful", "multi", "rainbow"],
  ["grey", "gray"],
  ["navy", "darkblue"],
  ["beige", "cream", "ecru", "tan"],
  ["wine", "burgundy", "maroon", "bordeaux"],
  ["purple", "violet", "lilac", "lavender"],
  ["pink", "rose", "blush"],
  ["bronze", "copper"],
  ["wanted", "looking", "seeking", "search"],
];

// Materials, each group being one material's names (English spellings and
// Finnish). Matched against the material field, title and description.
const MATERIAL_GROUPS = [
  ["cotton", "puuvilla"],
  ["wool", "woolen", "woollen", "villa", "villainen"],
  ["leather", "nahka", "nahkainen"],
  ["faux", "synthetic", "vegan", "pleather", "imitation", "tekonahka", "keinonahka"],
  ["linen", "pellava"],
  ["silk", "silkki", "silky"],
  ["denim", "farkku", "farkkukangas"],
  ["polyester", "polyesteri"],
  ["nylon", "polyamide", "polyamidi"],
  ["elastane", "spandex", "lycra", "elastaani", "stretch"],
  ["viscose", "rayon", "viskoosi"],
  ["acrylic", "akryyli"],
  ["cashmere", "kashmir"],
  ["merino", "merinowool", "merinovilla"],
  ["alpaca", "alpakka"],
  ["mohair"],
  ["angora"],
  ["lambswool"],
  ["tweed"],
  ["fleece", "fleecy", "fliisi"],
  ["down", "untuva", "feather", "feathers", "untuvatakki"],
  ["suede", "mokka", "nubuck"],
  ["corduroy", "vakosametti"],
  ["velvet", "velour", "sametti"],
  ["satin", "sateen", "satiini"],
  ["jersey", "trikoo"],
  ["flannel", "flanelli"],
  ["chambray"],
  ["poplin"],
  ["twill"],
  ["seersucker"],
  ["muslin", "musliini"],
  ["terry", "frotee"],
  ["chiffon", "sifonki"],
  ["lace", "pitsi"],
  ["tulle", "tylli"],
  ["canvas", "kanvas"],
  ["rubber", "kumi", "latex"],
  ["hemp", "hamppu"],
  ["bamboo", "bambu"],
  ["tencel", "lyocell"],
  ["modal"],
  ["acetate", "asetaatti"],
  ["neoprene", "neopreeni"],
  ["goretex"],
  ["polyurethane"],
  ["fur", "turkis"],
  ["shearling", "lampaannahka"],
  ["felt", "huopa"],
  ["straw", "olki"],
  ["cork", "korkki"],
  ["jute", "juutti"],
  ["plastic", "muovi"],
  ["crepe", "kreppi"],
  ["organza"],
  ["georgette"],
  ["taffeta", "tafti"],
  ["gabardine", "gabardiini"],
  ["brocade", "brokadi"],
  ["jacquard"],
  ["damask", "damasti"],
  ["voile"],
  ["boucle"],
  ["chenille"],
  ["sherpa", "teddy"],
  ["plush", "pehmo"],
  ["mesh"],
  ["microfiber", "microfibre", "mikrokuitu"],
  ["softshell"],
  ["ripstop"],
  ["cordura"],
  ["oilskin", "waxed", "vahakangas"],
  ["vinyl", "pvc"],
  ["patent", "lakka", "lakkanahka"],
  ["lurex", "metallic"],
  ["sequin", "sequins", "paljetti", "paljetit"],
  ["raffia", "rafia"],
  ["rattan"],
  ["wood", "wooden", "puu", "puinen"],
  ["metal", "metalli"],
  ["steel", "stainless", "teras"],
  ["primaloft"],
  ["thinsulate"],
  ["kevlar"],
];

// One-way: searching the key also finds the narrower materials made of it
// ("cotton" finds denim), but not the other way round.
const NARROWER = new Map([
  ["cotton", ["denim", "canvas", "corduroy", "flannel", "chambray", "jersey", "poplin", "twill", "terry", "muslin", "seersucker", "voile", "oilskin"]],
  ["wool", ["merino", "cashmere", "alpaca", "mohair", "angora", "lambswool", "tweed", "felt", "shearling", "boucle", "gabardine"]],
  ["leather", ["suede", "nubuck", "shearling", "patent"]],
  ["synthetic", ["polyester", "nylon", "polyamide", "acrylic", "elastane", "spandex", "fleece", "neoprene", "polyurethane", "microfiber", "vinyl", "sherpa"]],
  ["silk", ["satin", "chiffon", "organza", "georgette", "taffeta", "crepe"]],
  ["denim", ["jeans"]],
]);

const MATERIAL_WORDS = new Set(MATERIAL_GROUPS.flat());

// Finnish seasons. Listings have no season field, so a season word finds the
// items and materials worn then.
const SEASON_TERMS = {
  winter: [
    "winter", "wool", "merino", "cashmere", "alpaca", "down", "puffer", "padded", "quilted",
    "insulated", "thermal", "fleece", "parka", "coat", "overcoat", "peacoat", "snowsuit", "snow",
    "ski", "sweater", "jumper", "knit", "knitted", "cardigan", "turtleneck", "rollneck", "scarf",
    "beanie", "gloves", "mittens", "earmuffs", "balaclava", "boots", "warm", "cozy", "cosy", "cold",
    "colder", "shearling", "fur", "flannel", "corduroy", "velvet", "christmas",
  ],
  autumn: [
    "autumn", "fall", "jacket", "coat", "trench", "raincoat", "rain", "waterproof", "windbreaker",
    "parka", "sweater", "jumper", "knit", "knitted", "cardigan", "hoodie", "sweatshirt",
    "turtleneck", "flannel", "corduroy", "wool", "tweed", "jeans", "boots", "wellies",
    "gumboots", "scarf", "beanie", "gloves", "layering", "colder", "cozy", "cosy", "warm", "plaid",
    "tartan", "halloween",
  ],
  spring: [
    "spring", "jacket", "raincoat", "rain", "waterproof", "windbreaker", "trench", "jeans",
    "cardigan", "hoodie", "sweatshirt", "sneakers", "trainers", "canvas", "linen", "chinos", "blouse",
    "shirt", "layering", "floral", "pastel", "wellies", "gumboots", "easter",
  ],
  summer: [
    "summer", "tshirt", "tee", "tank", "shorts", "skirt", "dress", "sundress", "sandals", "flipflops",
    "slides", "espadrilles", "swimsuit", "swimwear", "bikini", "trunks", "sunglasses", "sunhat",
    "sun", "linen", "breathable", "lightweight", "sleeveless", "straw", "crochet", "poncho",
    "floral", "midsummer",
  ],
};

// Words people type for each season, in English and Finnish ("kesä" -> "kesa"),
// including holidays that fall in it.
const SEASON_ALIASES = new Map(
  Object.entries({
    winter: ["winter", "wintertime", "wintry", "talvi", "talvinen", "talvella", "kaamos", "christmas", "xmas", "joulu"],
    autumn: ["autumn", "autumnal", "fall", "syksy", "syksyinen", "syksylla", "ruska", "halloween"],
    spring: ["spring", "springtime", "kevat", "kevainen", "kevaalla", "vappu", "easter", "paasiainen"],
    summer: ["summer", "summertime", "summery", "kesa", "kesainen", "kesalla", "juhannus", "midsummer"],
  }).flatMap(([season, words]) => words.map((w) => [w, season]))
);

// Ways people describe condition, mapped to the listing condition values
// they mean. These filter strictly: "like new jacket" is jackets in like-new
// condition. Finnish arrives translated ("hyvä kunto" -> good condition).
const CONDITION_PHRASES = Object.entries({
  "like-new": [
    "like new", "as new", "brand new", "new", "mint", "unused", "unworn", "never worn", "never used",
    "excellent", "perfect", "pristine", "flawless", "nwt", "new with tags", "tags on",
  ],
  "like-new,gently-used": ["good", "very good", "great"],
  "gently-used": [
    "gently used", "gently worn", "gently", "lightly used", "lightly worn", "barely used", "barely worn",
    "slightly used", "little used", "hardly used", "hardly worn",
  ],
  "well-used": ["well used", "fair", "ok", "okay", "decent", "average", "moderately used"],
  "heavily-used": [
    "heavily used", "heavily worn", "heavily", "well worn", "worn", "worn out", "very worn", "very used",
    "poor", "damaged", "faded", "for parts",
  ],
  "gently-used,well-used,heavily-used": [
    "used", "secondhand", "second hand", "preloved", "pre loved", "preowned", "pre owned", "previously owned",
  ],
})
  .flatMap(([values, phrases]) => phrases.map((p) => [p.split(" "), values.split(",")]))
  // Longest first, so "like new" wins over "new" and "well worn" over "worn".
  .sort((a, b) => b[0].length - a[0].length);

const CONDITION_WORDS = new Set([...CONDITION_PHRASES.flatMap(([words]) => words), "condition"]);

// Words naming who an item is for, mapped to the listing category. These
// filter strictly too: "kids shoes" is shoes in the kids category, never
// men's boots. Finnish arrives translated ("lasten" -> kids).
const CATEGORY_WORDS = new Map(
  Object.entries({
    women: ["women", "womens", "woman", "ladies", "lady", "female", "females"],
    men: ["men", "mens", "man", "male", "males", "gents", "gentlemen", "gentleman"],
    kids: [
      "kids", "kid", "children", "childrens", "child", "baby", "babies", "toddler", "toddlers", "boy", "boys",
      "girl", "girls", "junior", "juniors", "youth", "infant", "infants", "teen", "teens",
    ],
  }).flatMap(([category, words]) => words.map((w) => [w, category]))
);

// Pull category words out of the query: { categories: Set, rest: words[] }.
function splitCategory(words) {
  const categories = new Set();
  const rest = [];
  for (const word of words) {
    if (CATEGORY_WORDS.has(word)) categories.add(CATEGORY_WORDS.get(word));
    else rest.push(word);
  }
  return { categories, rest };
}

/**
 * Pull condition phrases out of the query words. Returns the condition values
 * they mean (several phrases are alternatives) and the remaining words. A
 * "condition" right after a phrase is dropped: "good condition".
 */
function splitCondition(words) {
  const conditions = new Set();
  const rest = [];
  for (let i = 0; i < words.length; ) {
    const hit = CONDITION_PHRASES.find(([phrase]) => phrase.every((w, j) => words[i + j] === w));
    if (!hit) {
      rest.push(words[i++]);
      continue;
    }
    hit[1].forEach((value) => conditions.add(value));
    i += hit[0].length;
    if (words[i] === "condition") i++;
  }
  return { conditions, rest };
}

const { translate, FINNISH_WORDS, ENGLISH_WORDS } = require("./finnish");

const SYNONYMS = new Map();
[...SYNONYM_GROUPS, ...MATERIAL_GROUPS].forEach((group) =>
  group.forEach((word) => SYNONYMS.set(word, group.filter((w) => w !== word)))
);

// Words the search understands even though no listing contains them, so
// "Did you mean" leaves them alone.
const VOCABULARY = new Set([
  ...SYNONYMS.keys(),
  ...SEASON_ALIASES.keys(),
  ...GENERIC_WORDS,
  ...ENGLISH_WORDS,
  ...CONDITION_WORDS,
]);

// Other names people type for a place (Swedish names, abbreviations), mapped
// to the spelling used in listing addresses.
const LOCATION_ALIASES = new Map([
  ["helsingfors", "helsinki"],
  ["hki", "helsinki"],
  ["esbo", "espoo"],
  ["vanda", "vantaa"],
  ["grankulla", "kauniainen"],
  ["tammerfors", "tampere"],
  ["abo", "turku"],
  ["uleaborg", "oulu"],
  ["suomi", "finland"],
  ["finnland", "finland"],
]);

// "Mäkelä T-Shirt!" -> "makela tshirt"
function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/(\w)[-'’](\w)/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const tokenize = (text) => normalize(text).split(" ").filter(Boolean);

// Words to index for a listing field: "work-style" gives "workstyle" plus
// "work" and "style", so a search for either half finds it.
const indexWords = (text) => [
  ...new Set([...tokenize(text), ...tokenize(String(text ?? "").replace(/-/g, " "))]),
];

// "aleksis kiven katu" -> also "aleksiskiven", "kivenkatu", "aleksiskivenkatu",
// so street names match whether typed as one word or several.
function withJoined(words) {
  const joined = [];
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 2; j <= words.length; j++) joined.push(words.slice(i, j).join(""));
  }
  return [...new Set([...words, ...joined])];
}

const isNumber = (word) => /^\d+$/.test(word);

// Number of typos tolerated for a word. Short words and numbers (postcodes,
// sizes) must match exactly: 00531 is a different area from 00530.
const maxEdits = (word) =>
  isNumber(word) ? 0 : word.length <= 3 ? 0 : word.length <= 6 ? 1 : 2;

// Place names get one more typo than other words: there are only a few dozen
// of them, so "esbpo" can only mean Espoo, and they're often hard to spell.
const locationEdits = (word) =>
  isNumber(word) || word.length <= 3 ? 0 : word.length === 4 ? 1 : word.length <= 7 ? 2 : 3;

// Numbers need 3 digits before prefix matching, so "005" finds 00510 and 00530
// but "10" doesn't match every postcode containing 10.
const minPrefix = (word) => (isNumber(word) ? 3 : 2);

// Optimal string alignment distance (Levenshtein + adjacent transpositions).
// Returns max + 1 as soon as the distance is known to exceed `max`.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a === b) return 0;

  let prevPrev = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (prevPrev && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1);
      }
      row.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length];
}

const singular = (word) => (word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word);

// How well one query word matches one word of a listing, 0..1.
// `allowed` is the number of typos tolerated (0 for synonyms, which are spelled right).
// `partial` allows a typo inside a half-typed word, the loosest kind of match.
function termScore(query, word, allowed = maxEdits(query), partial = true) {
  if (query === word) return 1;
  if (singular(query) === singular(word)) return 0.95;
  if (query.length >= minPrefix(query) && word.startsWith(query)) return 0.85;

  if (allowed === 0) return 0;

  const distance = editDistance(query, word, allowed);
  if (distance <= allowed) return [0.75, 0.6, 0.5][distance - 1] ?? 0.5;

  // One typo inside a partially typed word: "jakc" vs "jacket".
  if (partial && query.length >= 4 && word.length > query.length) {
    if (editDistance(query, word.slice(0, query.length), 1) <= 1) return 0.5;
  }
  return 0;
}

// A listing field's searchable text. Descriptions end with a photo credit
// ("Photo by Old Youth (https://…)") that says nothing about the item, and
// would otherwise make "kids" match a photographer called Youth.
function fieldText(listing, field) {
  const text = listing[field];
  if (field !== "description" || !text) return text;
  return String(text).replace(/\s*Photo by .*$/s, "");
}

function indexListing(listing) {
  const fields = {};
  Object.keys(FIELD_WEIGHTS).forEach((field) => {
    const words = indexWords(fieldText(listing, field));
    if (words.length) fields[field] = field === "street" ? withJoined(words) : words;
  });
  return { listing, fields, title: normalize(listing.title) };
}

// Best weighted match for one query word anywhere in the listing.
function bestFieldScore(doc, word, allowed = maxEdits(word), partial = true) {
  let best = 0;
  for (const [field, words] of Object.entries(doc.fields)) {
    const weight = FIELD_WEIGHTS[field];
    for (const candidate of words) {
      const score = termScore(word, candidate, allowed, partial) * weight;
      if (score > best) best = score;
    }
  }
  return best;
}

// Finnish words become their English translations ("musta nahkatakki" ->
// black leather jacket). Words that are already English (in some listing, or
// understood by the search and not Finnish) are kept, so "stretch" stays "stretch".
function toEnglish(words, known) {
  return words.flatMap((w) => {
    if (LOCATION_ALIASES.has(w)) return [LOCATION_ALIASES.get(w)];
    if (known.has(w) || (VOCABULARY.has(w) && !FINNISH_WORDS.has(w))) return [w];
    return translate(w) || [w];
  });
}

// Every word indexed for the given listings.
const knownWords = (docs) => new Set(docs.flatMap((doc) => Object.values(doc.fields).flat()));

function parseQuery(keywords, known = new Set()) {
  const all = toEnglish(tokenize(keywords), known);
  const words = all.filter((w) => !STOPWORDS.has(w) && !GENERIC_WORDS.has(w));
  // Only generic words ("clothes") means everything; only stopwords searches them as typed.
  const fallback = all.some((w) => GENERIC_WORDS.has(w)) ? [] : all;
  return { words: words.length ? words : fallback, phrase: normalize(keywords) };
}

// The season a query word names, allowing a typo in the longer season words
// ("autum", "wintr") unless the word itself appears in some listing.
function seasonOf(word, known) {
  if (SEASON_ALIASES.has(word)) return SEASON_ALIASES.get(word);
  if (word.length < 5 || known.has(word)) return null;
  for (const [alias, season] of SEASON_ALIASES) {
    if (alias.length >= 6 && editDistance(word, alias, maxEdits(word)) <= maxEdits(word)) return season;
  }
  return null;
}

// What a query word also matches, as [word, factor] pairs: synonyms and
// narrower materials count a little less than the word itself, items worn in
// a season a little less again.
function expand(word, known) {
  const season = seasonOf(word, known);
  return {
    word,
    expansions: [
      ...(SYNONYMS.get(word) || []).map((w) => [w, 0.8]),
      ...(NARROWER.get(word) || []).map((w) => [w, 0.8]),
      ...(season ? SEASON_TERMS[season].map((w) => [w, 0.7]) : []),
    ],
    // Materials and seasons describe the item, so in "cotton tie" a tie made of
    // something else ranks above a cotton shirt.
    weight: season || MATERIAL_WORDS.has(word) ? 0.6 : 1,
  };
}

const isDescriptor = (word) => SEASON_ALIASES.has(word) || MATERIAL_WORDS.has(word);

function scoreListing(doc, { terms, phrase, partial }) {
  let total = 0;
  let matched = 0;

  for (const { word, expansions, weight } of terms) {
    // A known material or season word is spelled right: "linen" is not a typo of "lining".
    let score = VOCABULARY.has(word)
      ? bestFieldScore(doc, word, 0, false)
      : bestFieldScore(doc, word, maxEdits(word), partial.has(word));
    for (const [other, factor] of expansions) {
      score = Math.max(score, bestFieldScore(doc, other, 0, false) * factor);
    }
    if (score > 0) matched++;
    total += score * weight;
  }

  const coverage = matched / terms.length;
  const phraseBonus = terms.length > 1 && doc.title.includes(phrase) ? 2 : 0;
  return { coverage, score: total + phraseBonus };
}

// Best unweighted match for `word` within the given fields of one listing.
function matchIn(doc, fields, word, allowed = maxEdits(word)) {
  let best = 0;
  for (const field of fields) {
    for (const candidate of doc.fields[field] || []) {
      best = Math.max(best, termScore(word, candidate, allowed));
    }
  }
  return best;
}

const matchLocation = (doc, field, word) => matchIn(doc, [field], word, locationEdits(word));

const ITEM_FIELDS = Object.keys(FIELD_WEIGHTS).filter((f) => !LOCATION_FIELDS.includes(f));

// How well `word` matches as a place vs as an item, over all listings.
function classify(docs, word) {
  let field = null;
  let location = 0;
  let item = 0;
  for (const doc of docs) {
    for (const f of LOCATION_FIELDS) {
      const score = matchLocation(doc, f, word);
      if (score > location) [location, field] = [score, f];
    }
    item = Math.max(item, matchIn(doc, ITEM_FIELDS, word));
  }
  return { field, isLocation: !!field && location >= item };
}

/**
 * Pull location words out of the query. A word counts as a location when it
 * matches some listing's postcode/city/street/country at least as well as it
 * matches any item text, so "helsnki" is a place but "black" never is.
 * Adjacent words are first tried joined, so "flemingin katu" and
 * "mannerheim tie" are read as one street name.
 * Returns { constraints: Map<field, words[]>, rest: words[] }.
 */
function splitLocation(docs, words) {
  const constraints = new Map();
  const rest = [];
  const add = (field, word) => constraints.set(field, [...(constraints.get(field) || []), word]);

  for (let i = 0; i < words.length; i++) {
    let joinedLength = 0;
    for (let n = Math.min(3, words.length - i); n >= 2 && !joinedLength; n--) {
      const joined = words.slice(i, i + n).join("");
      const { field, isLocation } = classify(docs, joined);
      if (isLocation) {
        add(field, joined);
        joinedLength = n;
      }
    }
    if (joinedLength) {
      i += joinedLength - 1;
      continue;
    }

    // Materials and seasons are never places, even when one is close to a street name.
    const { field, isLocation } = isDescriptor(words[i]) ? {} : classify(docs, words[i]);
    if (isLocation) add(field, words[i]);
    else rest.push(words[i]);
  }
  return { constraints, rest };
}

// Every kind of location given must match (postcode AND city); several words
// of one kind are alternatives ("Espoo Vantaa" = either city).
const inLocation = (doc, constraints) =>
  [...constraints].every(([field, words]) => words.some((w) => matchLocation(doc, field, w) > 0));

/**
 * Rank listings against free-text keywords.
 * Category words ("kids", "women"), condition phrases ("like new", "used") and
 * location words (postcode, city, street, country) filter strictly: a query of
 * only those returns everything matching them. The remaining words are ranked: one
 * word must match; longer queries need at least half their words to match,
 * and listings matching more words always rank first.
 */
function searchListings(listings, keywords) {
  let docs = listings.map(indexListing);
  const known = knownWords(docs);
  const query = parseQuery(keywords, known);
  if (!query.words.length) return listings;

  const { categories, rest: uncategorized } = splitCategory(query.words);
  if (categories.size) docs = docs.filter((doc) => categories.has(doc.listing.category));

  const { conditions, rest: unconditioned } = splitCondition(uncategorized);
  if (conditions.size) docs = docs.filter((doc) => conditions.has(doc.listing.condition));

  const { constraints, rest } = splitLocation(docs, unconditioned);
  if (constraints.size) docs = docs.filter((doc) => inLocation(doc, constraints));
  if (!rest.length) return docs.map((doc) => doc.listing);

  // Half-typed-word matches ("jakc" -> jacket) only for words with no full-word
  // match anywhere, so "bots" finds boots but not "bottoms".
  const partial = new Set(
    rest.filter((w) => !docs.some((doc) => bestFieldScore(doc, w, maxEdits(w), false) > 0))
  );
  const itemQuery = { terms: rest.map((w) => expand(w, known)), phrase: rest.join(" "), partial };
  const minCoverage = rest.length === 1 ? 1 : 0.5;

  return docs
    .map((doc) => ({ doc, ...scoreListing(doc, itemQuery) }))
    .filter((r) => r.coverage >= minCoverage && r.score > 0)
    .sort((a, b) => b.coverage - a.coverage || b.score - a.score)
    .map((r) => r.doc.listing);
}

/**
 * "Did you mean" for the query, built from words that actually appear in the
 * listings. Returns null when every word is already spelled like a real one.
 * With `typing`, the last word may still be half-typed, so it is left alone
 * while it is the start of a real word ("jack" on the way to "jacket").
 */
function suggestKeywords(listings, keywords, { typing = false } = {}) {
  const frequency = new Map();
  const places = new Set();
  listings.forEach((listing) =>
    Object.keys(FIELD_WEIGHTS).forEach((field) =>
      indexWords(fieldText(listing, field)).forEach((w) => {
        frequency.set(w, (frequency.get(w) || 0) + 1);
        if (LOCATION_FIELDS.includes(field)) places.add(w);
      })
    )
  );

  // Typos allowed when correcting `word` to `candidate`. A postcode that
  // doesn't exist ("00531", "0530") is offered the closest real one.
  const allowedFor = (word, candidate) => {
    if (isNumber(word)) return word.length >= 4 && places.has(candidate) ? 1 : 0;
    return places.has(candidate) ? locationEdits(word) : maxEdits(word);
  };

  const words = tokenize(keywords);
  const startsKnownWord = (word) =>
    word.length >= minPrefix(word) &&
    [...frequency.keys(), ...VOCABULARY, ...FINNISH_WORDS].some((known) => known.startsWith(word));

  let changed = false;
  const corrected = words.map((word, i) => {
    if (typing && i === words.length - 1 && startsKnownWord(word)) return word;
    // Aliases ("esbo") are other names for a place, and materials and seasons
    // are understood even when no listing uses the word: not misspellings.
    if (
      frequency.has(word) ||
      STOPWORDS.has(word) ||
      LOCATION_ALIASES.has(word) ||
      VOCABULARY.has(word) ||
      translate(word)
    ) {
      return word;
    }
    // A typo of a season ("autum") is corrected to it.
    const season = seasonOf(word, frequency);
    if (season) {
      changed = true;
      return season;
    }

    let best = null;
    for (const [candidate, count] of frequency) {
      const allowed = allowedFor(word, candidate);
      const distance = editDistance(word, candidate, allowed);
      if (distance > allowed) continue;
      if (!best || distance < best.distance || (distance === best.distance && count > best.count)) {
        best = { candidate, distance, count };
      }
    }
    if (!best) return word;
    changed = true;
    return best.candidate;
  });

  return changed ? corrected.join(" ") : null;
}

const AUTOCOMPLETE_ITEMS = 6;
const AUTOCOMPLETE_PLACES = 5;

// Kinds of place offered while typing, in display order.
const PLACE_KINDS = ["city", "postcode", "street"];

// What the user has typed so far: finished words plus the word still being
// typed, Finnish translated to English ("musta takk" -> black jacket).
function parseTyped(text, known = new Set()) {
  const words = toEnglish(tokenize(text), known);
  return { phrase: words.join(" "), done: words.slice(0, -1), last: words[words.length - 1] };
}

// 0 = no match, higher = better: the text starts with what was typed (3), its
// words cover it with the last word as a prefix (2), or the same allowing
// `allowed` typos in the last word (1). Finished words may always have typos.
function prefixRank(value, typed, allowed) {
  if (normalize(value.text).startsWith(typed.phrase)) return 3;
  const words = value.words;
  if (!typed.done.every((d) => words.some((w) => termScore(d, w) > 0))) return 0;
  if (words.some((w) => w.startsWith(typed.last))) return 2;
  if (allowed && words.some((w) => termScore(typed.last, w, allowed) > 0)) return 1;
  return 0;
}

const rankAll = (values, typed, allowed) =>
  values.map((v) => ({ ...v, rank: prefixRank(v, typed, allowed) })).filter((v) => v.rank);

// Exact prefixes first; typo matches only if nothing starts with the text.
function rankWithFallback(values, typed, allowedFor) {
  const exact = rankAll(values, typed, 0);
  return exact.length ? exact : rankAll(values, typed, allowedFor(typed.last));
}

/**
 * Suggestions while typing: listings whose title has a word starting with the
 * text, and cities/postcodes/streets starting with it. Earlier words narrow
 * the listings, and can be a place ("sweater hel" -> sweaters in Helsinki).
 * Falls back to typo-tolerant matching when nothing starts with the text, so
 * "helsn" still offers Helsinki.
 */
function autocomplete(listings, text) {
  const known = new Set(
    listings.flatMap((l) => Object.keys(FIELD_WEIGHTS).flatMap((f) => indexWords(fieldText(l, f))))
  );
  const typed = parseTyped(text, known);
  if (!typed.last) return { items: [], places: [] };

  const multiWord = typed.done.length > 0;
  const itemValues = listings.map((listing) => ({
    listing,
    text: listing.title,
    words: [
      ...indexWords(listing.title),
      // With several words, one of them can be where the item is.
      ...(multiWord ? LOCATION_FIELDS.flatMap((f) => withJoined(indexWords(listing[f]))) : []),
    ],
  }));

  const items = rankWithFallback(itemValues, typed, maxEdits)
    .sort((a, b) => b.rank - a.rank || a.text.localeCompare(b.text))
    .slice(0, AUTOCOMPLETE_ITEMS)
    .map((v) => v.listing);

  // One entry per distinct place, with how many listings are there.
  const places = new Map();
  listings.forEach((listing) =>
    PLACE_KINDS.forEach((kind) => {
      const value = listing[kind];
      if (!value) return;
      const key = `${kind}:${value}`;
      const place = places.get(key) || {
        kind,
        value,
        city: listing.city,
        text: value,
        words: withJoined(indexWords(value)),
        count: 0,
      };
      place.count++;
      places.set(key, place);
    })
  );

  // Places match the whole text, or failing that just the word being typed
  // ("sweater hel" offers Helsinki, and picking it searches "sweater Helsinki").
  const placeValues = [...places.values()];
  let placeMatches = rankWithFallback(placeValues, typed, locationEdits);
  let before = "";
  if (!placeMatches.length && multiWord) {
    placeMatches = rankWithFallback(placeValues, parseTyped(typed.last, known), locationEdits);
    before = String(text).trim().split(/\s+/).slice(0, -1).join(" ");
  }

  const matchedPlaces = placeMatches
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        PLACE_KINDS.indexOf(a.kind) - PLACE_KINDS.indexOf(b.kind) ||
        b.count - a.count ||
        a.value.localeCompare(b.value)
    )
    .slice(0, AUTOCOMPLETE_PLACES)
    // `query` is what to search when picked; `count` only applies to the place alone.
    .map(({ kind, value, city, count }) => ({
      kind,
      value,
      city,
      count: before ? null : count,
      query: before ? `${before} ${value}` : value,
    }));

  return { items, places: matchedPlaces };
}

module.exports = { searchListings, suggestKeywords, autocomplete, normalize, editDistance };

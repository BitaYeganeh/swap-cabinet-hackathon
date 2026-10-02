// Finnish -> English for search. Listings are written in English, so Finnish
// query words are translated before matching: "musta nahkatakki" searches
// "black leather jacket".
//
// Forms are written without diacritics, as the search normalizes them
// ("kenkä" -> "kenka"). A form ending in "-" is a stem matching any ending
// ("kenk-" covers kenkä, kenkiä, kenkien), since Finnish inflects heavily;
// other forms must match exactly. Several English words ("wool sweater")
// are all searched.
const DICTIONARY = {
  // Gender and age
  women: ["nainen", "naiset", "naisten", "naiselle", "naisille", "nais-", "rouva", "neiti", "daami-"],
  men: ["mies", "miehet", "miesten", "miehelle", "miehille", "mies-", "mieh-", "herra-"],
  kids: [
    "lapsi", "lapset", "lasten", "lapselle", "lapsille", "laps-", "junior-", "nuori", "nuoret", "nuorten",
    "teini-", "koululai-",
  ],
  baby: ["vauva", "vauv-", "vauvoille"],
  toddler: ["taapero-"],
  girls: ["tytto", "tytot", "tytt-", "tyto-"],
  boys: ["poika", "pojat", "poik-", "poja-"],
  unisex: ["unisex"],

  // Categories
  tops: ["ylaosa-", "ylavartalo-"],
  bottoms: ["alaosa-", "alavartalo-"],
  shoes: ["kenka", "kengat", "kenk-", "keng-", "jalkine-", "jalkinei-"],
  accessories: ["asuste-", "asustei-", "tarvike-", "tarvikkei-"],
  bundle: ["nippu", "niput", "nipun", "nippuna", "setti", "setit", "seti-", "paketti", "paketit", "paket-", "satsi-"],
  clothing: ["vaate-", "vaattei-", "vaatteet"],

  // Tops
  shirt: ["paita", "paidat", "paidan", "paitoja", "pait-", "paid-", "kauluspai-", "kauluspaid-"],
  tshirt: ["tpaita", "tpai-", "tpaid-", "teepai-", "teepaid-"],
  blouse: ["pusero", "puserot", "puseroi-", "pusero-", "tunika-"],
  sweatshirt: ["collegepai-", "collegepaid-", "college-", "college"],
  hoodie: ["huppari", "huppar-", "huppupai-", "huppupaid-", "huppu"],
  sweater: ["neule", "neuleet", "neulee-", "neulei-", "neulepai-", "neulepaid-", "jumpper-"],
  "wool sweater": ["villapai-", "villapaid-", "villaneule-"],
  cardigan: ["neuletakki", "neuletak-", "jakku", "jakut", "jaku-", "jakk-", "villatakki", "villatak-"],
  top: ["toppi", "topit", "topp-", "hihaton-"],
  turtleneck: ["poolo", "poolopai-", "poolopaid-", "poolokaulu-", "kauluri"],
  vest: ["liivi", "liivit", "liiv-"],
  blazer: ["bleiseri", "bleiser-", "pikkutakki", "pikkutak-"],

  // Outerwear
  jacket: ["takki", "takit", "takin", "takkia", "takkeja", "takk-", "ulkoilutak-"],
  coat: ["mantteli", "manttel-", "paltto", "palto-", "palttoo-", "villakangastak-"],
  parka: ["parka", "parkat", "parkatak-"],
  raincoat: ["sadetakki", "sadetak-", "sadeasu-", "sadevaate-"],
  windbreaker: ["tuulitakki", "tuulitak-", "kuoritakki", "kuoritak-"],
  puffer: ["toppatakki", "toppatak-", "toppa-"],
  snowsuit: ["toppapuku", "toppapuk-", "haalari-"],
  bomber: ["bomber-", "bomberi-"],
  trench: ["trenssi-"],

  // Bottoms
  pants: ["housut", "housu-", "pantsit", "pantsi-", "verkkarit", "verkkar-", "collegehousu-", "chinot", "chino-"],
  jeans: ["farkut", "farkkuja", "farkkuh-", "farkkuhousu-", "farkkari-"],
  shorts: ["shortsit", "shortsi-", "shortse-", "sortsit", "sortsi-", "shortsei-"],
  skirt: ["hame", "hameet", "hameen", "hametta", "hamee-", "hamei-", "minihame-", "maksihame-"],
  leggings: ["leggingsit", "leggins-", "trikoot", "trikoo-"],
  overalls: ["haalarit", "lappuhaalari-"],

  // Dresses and suits
  dress: ["mekko", "mekot", "mekon", "mekkoa", "mekkoja", "mekk-", "leninki", "lenink-", "juhlamekko-"],
  gown: ["iltapuku", "iltapuk-", "iltamekko-"],
  suit: ["puku", "puvut", "puvun", "pukua", "pukuja", "jakkupuku-"],
  jumpsuit: ["jumpsuit-", "haalarimekko-"],

  // Shoes
  sneakers: ["lenkkarit", "lenkkari-", "lenkkar-", "tennarit", "tennari-", "tennar-", "juoksuken-", "juoksukeng-", "urheiluken-", "urheilukeng-"],
  boots: ["saappaat", "saapas", "saappa-", "saappai-", "varsikeng-", "varsiken-","maiharit", "maihar-"],
  ankle: ["nilkka-"],
  sandals: ["sandaalit", "sandaali-", "sandaal-"],
  flipflops: ["varvastossut", "varvastossu-", "varvassandaal-", "flipflop-"],
  slippers: ["tohvelit", "tohveli-", "tohvel-", "tossut", "tossu-", "sisakeng-", "sisaken-"],
  heels: ["korkokeng-", "korkoken-", "korot", "piikkikor-"],
  loafers: ["loaferit", "loafer-", "mokkasiin-"],
  wellies: ["kumisaappa-", "kumpparit", "kumppari-"],

  // Accessories
  bag: ["laukku", "laukut", "laukun", "laukkua", "laukkuja", "laukk-", "kassi", "kassit", "kassi-", "olkalauk-"],
  handbag: ["kasilauk-"],
  backpack: ["reppu", "reput", "repun", "reppua", "reppuja", "repp-", "rinkka-"],
  belt: ["vyo", "vyot", "vyon", "vyota", "vyoita"],
  tie: ["solmio", "solmiot", "solmion", "solmiota", "solmioita", "solmio-", "kravatti-", "rusetti-"],
  sunglasses: ["aurinkolasit", "aurinkolas-", "aurinkolase-"],
  glasses: ["silmalasit", "silmalas-", "lasit"],
  hat: ["hattu", "hatut", "hatun", "hattua", "hattuja", "hatt-", "aurinkohat-"],
  beanie: ["pipo", "pipot", "pipon", "pipoa", "pipoja", "pipo-", "myssy-"],
  cap: ["lippis", "lippikset", "lippiks-", "lippalak-", "lippa-"],
  scarf: ["huivi", "huivit", "huivi-", "huiv-", "kaulaliina-", "kaulahuivi-", "kauluri-"],
  gloves: ["hanskat", "hansk-", "kasineet", "kasine-", "sormikka-"],
  mittens: ["lapaset", "lapas-", "lapase-", "rukkas-", "rukkase-"],
  socks: ["sukat", "sukka", "sukk-"],
  jewelry: ["korut", "koru", "koru-", "kaulakoru-", "korvakoru-", "rannekoru-", "sormus-"],
  watch: ["kello", "kellot", "rannekello-"],
  wallet: ["lompakko", "lompakot", "lompak-", "kukkaro-"],
  umbrella: ["sateenvarjo-"],

  // Swimwear and underwear
  swimsuit: ["uimapuku", "uimapuk-", "uima-"],
  bikini: ["bikinit", "bikini-"],
  underwear: ["alusvaate-", "alusvaattei-", "alushousu-", "kalsarit", "kalsar-", "rintaliivi-"],
  pajamas: ["pyjama-", "yopuku-", "yopaita-"],
  robe: ["aamutakki", "aamutak-", "kylpytakki-"],

  // Colours
  black: ["musta", "mustat", "mustan", "mustaa", "mustia", "mustana", "mustaks-"],
  white: ["valkoinen", "valkoiset", "valkoisen", "valkoista", "valkoisia", "valkoi-", "valkea", "valke-"],
  blue: ["sininen", "siniset", "sinisen", "sinista", "sinisia", "sinise-", "sinine-"],
  navy: ["laivastonsin-", "tummansin-"],
  "light blue": ["vaaleansin-"],
  green: ["vihrea", "vihreat", "vihrean", "vihreaa", "vihreita", "vihre-", "oliivi-", "kaki-"],
  brown: ["ruskea", "ruskeat", "ruskean", "ruskeaa", "ruskeita", "ruske-"],
  bronze: ["pronssi", "pronssin", "pronssi-", "pronss-", "kupari-"],
  multicolor: ["monivarinen", "monivari-", "kirjava", "kirjav-", "varikas", "varikkaa-", "varikka-", "sateenkaari-"],
  red: ["punainen", "punaiset", "punaisen", "punaista", "punaisia", "punai-"],
  wine: ["viininpun-", "viini-", "viini", "bordeaux-", "viinin-"],
  yellow: ["keltainen", "keltaiset", "keltaisen", "keltaista", "keltai-", "sinappi-"],
  grey: ["harmaa", "harmaat", "harmaan", "harmaata", "harmaita", "harma-"],
  pink: ["pinkki", "pinkit", "pinkk-", "vaaleanpun-", "roosa-"],
  purple: ["violetti", "violet-", "lila", "lilat", "lila-", "purppura-", "liila-"],
  orange: ["oranssi", "oranssit", "oranss-"],
  beige: ["beessi", "beess-", "beige-", "kerma-"],
  gold: ["kulta", "kultainen", "kultai-", "kullan-"],
  silver: ["hopea", "hopeinen", "hopei-", "hopea-"],
  turquoise: ["turkoosi", "turkoos-"],
  light: ["vaalea", "vaaleat", "vaalean", "vaaleaa", "vaaleita"],
  dark: ["tumma", "tummat", "tumman", "tummaa", "tummia"],
  striped: ["raidallinen", "raidalli-", "raita", "raitainen", "raitai-", "raidat"],
  plaid: ["ruudullinen", "ruudulli-", "ruutu-", "ruudut"],
  floral: ["kukallinen", "kukalli-", "kukkakuvio-", "kukka-"],
  print: ["kuvio", "kuviot", "kuvioi-", "printti-", "painatus-"],

  // Condition
  new: ["uusi", "uudet", "uuden", "uutta", "uusia", "kayttamaton-", "kayttamattom-"],
  "like new": ["uudenveroi-", "uudenvero-"],
  used: ["kaytetty", "kaytetyt", "kaytetyn", "kaytettya", "kaytet-", "kaytty-", "kierratys-"],
  gently: ["vahan", "hieman"],
  "gently used": ["vahankaytet-"],
  worn: ["kulunut", "kuluneet", "kuluneen", "kulun-", "kulune-"],
  good: ["hyva", "hyvat", "hyvan", "hyvaa", "hyvia", "hyvas-"],
  "good condition": ["hyvakuntoi-"],
  condition: ["kunto", "kunnossa", "kunnon", "kuntoinen", "kuntoi-"],
  clean: ["siisti", "siistit", "siistin", "siisti-", "puhdas", "puhtaa-"],

  // Size and fit
  size: ["koko", "koon", "kokoa", "koossa", "koot"],
  small: ["pieni", "pienet", "pienen", "pienta", "pienia", "pien-"],
  medium: ["keskikoko", "keskikoko-", "keskikokoi-"],
  large: ["suuri", "suuret", "suuren", "suur-", "iso", "isot", "ison", "isoa", "isoja"],
  long: ["pitka", "pitkat", "pitkan"],
  "long sleeve": ["pitkahih-"],
  sleeve: ["hiha", "hihat", "hihai-", "hihan-"],
  slim: ["kapea", "kapeat", "kapea-", "slim-"],
  loose: ["loysa", "loysat", "lopsakka-", "oversize-"],
  warm: ["lammin", "lampimat", "lampima-", "lampoi-"],
  soft: ["pehmea", "pehmeat", "pehme-"],
  handmade: ["kasintehty-", "kasityo-", "itsetehty-"],
  matching: ["yhteensopi-", "samanvari-"],

  // Wanted listings
  looking: ["etsitaan", "etsin", "etsimme", "haetaan", "haen", "ostetaan", "ostan", "halutaan"],

  // Materials
  cotton: ["puuvilla", "puuvillaa", "puuvillasta", "puuvill-"],
  wool: ["villa", "villaa", "villasta", "villainen", "villaiset", "villai-", "villa-"],
  leather: ["nahka", "nahkaa", "nahkasta", "nahkainen", "nahkai-", "nahk-"],
  faux: ["teko-", "keino-"],
  "faux leather": ["tekonahk-", "keinonahk-"],
  "faux fur": ["tekoturki-", "tekoturkk-"],
  linen: ["pellava", "pellavaa", "pellavasta", "pellav-"],
  silk: ["silkki", "silkkia", "silkista", "silkki-", "silkk-"],
  denim: ["farkku", "farkkukangas-", "denim-"],
  polyester: ["polyesteri", "polyester-"],
  nylon: ["polyamidi", "polyamid-", "nailon-"],
  elastane: ["elastaani", "elastaan-", "lycra-", "joustava", "joustav-"],
  viscose: ["viskoosi", "viskoos-"],
  acrylic: ["akryyli", "akryyl-"],
  cashmere: ["kashmir-", "kasmir-"],
  merino: ["merinovilla", "merinovill-", "merino-"],
  alpaca: ["alpakka", "alpakk-"],
  fleece: ["fleece-", "fliisi", "fliis-", "flisi-"],
  down: ["untuva", "untuvaa", "untuv-"],
  suede: ["mokka", "mokkaa", "mokkanahk-", "mokk-"],
  corduroy: ["vakosametti", "vakosamet-"],
  velvet: ["sametti", "samettia", "samet-", "veluuri-"],
  satin: ["satiini", "satiin-", "satin-"],
  jersey: ["trikoo", "trikoota", "jersey-"],
  flannel: ["flanelli", "flanell-"],
  lace: ["pitsi", "pitsia", "pitsi-", "pitsinen"],
  canvas: ["kanvas-", "kangas", "kankaa-", "purje-"],
  rubber: ["kumi", "kumia", "kumista", "kuminen", "kumi-"],
  fur: ["turkis", "turkiks-", "turki-", "turkki-"],
  felt: ["huopa", "huovasta", "huopa-"],
  straw: ["olki", "oljesta", "olki-"],
  wood: ["puu", "puinen", "puiset", "puinen-"],
  metal: ["metalli", "metalli-"],
  plastic: ["muovi", "muovinen", "muovi-"],

  // Seasons (the search knows the English season words)
  winter: ["talvi", "talven", "talvella", "talveksi", "talvinen", "talvise-", "talvi-", "kaamos", "joulu", "joulu-", "pakkas-", "pakkase-"],
  autumn: ["syksy", "syksyn", "syksylla", "syksyksi", "syksyinen", "syksyi-", "syksy-", "ruska", "ruska-"],
  spring: ["kevat", "kevaan", "kevaalla", "kevaaksi", "kevainen", "kevai-", "kevat-", "vappu", "vappu-", "paasiai-"],
  summer: ["kesa", "kesan", "kesalla", "kesaksi", "kesainen", "kesai-", "kesa-", "juhannus", "juhannus-", "helle-", "hellee-"],
};

const EXACT = new Map();
const STEMS = [];
for (const [english, forms] of Object.entries(DICTIONARY)) {
  const words = english.split(" ");
  for (const form of forms) {
    if (form.endsWith("-")) STEMS.push([form.slice(0, -1), words]);
    else EXACT.set(form, words);
  }
}
// Longest stem first, so "villapai-" (sweater) wins over "villa-" (wool).
STEMS.sort((a, b) => b[0].length - a[0].length);

const MIN_PART = 3;
// Letters allowed between a stem and the next part of a compound:
// "nahk" + "a" + "takki", "nais" + "ten" + "kengat".
const MAX_LINK = 3;

// English words for one Finnish word, or null. Compound words are split
// into known parts: "nahkatakki" -> leather + jacket, "talvikengat" -> winter + shoes.
function translate(word) {
  if (EXACT.has(word)) return EXACT.get(word);

  const stem = STEMS.find(([s]) => word.startsWith(s));
  if (stem) {
    const [s, english] = stem;
    for (let i = s.length; i <= s.length + MAX_LINK && word.length - i >= MIN_PART; i++) {
      const tail = translate(word.slice(i));
      if (tail) return [...english, ...tail];
    }
    return english;
  }

  // Compound starting with an exact word: "musta" + "valkoinen".
  for (let i = word.length - MIN_PART; i >= MIN_PART; i--) {
    const head = EXACT.get(word.slice(0, i));
    const tail = head && translate(word.slice(i));
    if (tail) return [...head, ...tail];
  }
  return null;
}

// Every Finnish form, so "Did you mean" leaves half-typed Finnish alone.
const FINNISH_WORDS = new Set([...EXACT.keys(), ...STEMS.map(([s]) => s)]);

// Every English translation: real words, never typos ("skirt" is not "shirt").
const ENGLISH_WORDS = new Set(Object.keys(DICTIONARY).flatMap((english) => english.split(" ")));

module.exports = { translate, FINNISH_WORDS, ENGLISH_WORDS };

// Suggestions while typing in the search bar: matching listings, places and a
// "did you mean" spelling, from every published listing. No Claude calls.
//
// Uses the same cached listing list as the keyword search (refreshed every
// minute from the Marketplace API), so it is fast and never shows a listing
// that is no longer published for more than that minute.
//
// Adapted from the Hackathon team 4 search server (getAutocomplete).

const { allListings } = require('./keyword-search');
const { autocomplete, suggestKeywords } = require('./fuzzySearch');

const MAX_QUERY_LENGTH = 100;

// Only what a suggestion row shows.
const toItem = listing => ({
  id: listing.id,
  title: listing.title,
  listingType: listing.listingType || null,
  price: listing.price || null,
  city: listing.city || null,
  image: listing.image || null,
});

async function getAutocomplete(rawQuery) {
  const q = String(rawQuery ?? '')
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
  if (!q) return { suggestion: null, items: [], places: [] };

  const listings = await allListings();
  const { items, places } = autocomplete(listings, q);
  return {
    suggestion: suggestKeywords(listings, q, { typing: true }),
    items: items.map(toItem),
    places,
  };
}

module.exports = { getAutocomplete };

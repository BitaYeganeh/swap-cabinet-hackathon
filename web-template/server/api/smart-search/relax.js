// The filter-relaxing rule, kept pure so it can be tested without the API.

// Least important first.
const RELAX_ORDER = ['color', 'condition', 'size', 'minPrice', 'maxPrice', 'keywords', 'type'];

// Never drop the last thing describing the item ("socks" in "pink socks"):
// with only a category or sort left, every listing would "match".
const canDrop = (filters, key) =>
  Object.keys(filters).some(k => k !== key && k !== 'sort' && k !== 'category' && k !== 'gender');

module.exports = { RELAX_ORDER, canDrop };

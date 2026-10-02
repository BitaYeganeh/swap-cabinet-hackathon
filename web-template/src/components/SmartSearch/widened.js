// What dropping each AI filter means for the shopper, as a phrase.
const WIDENED = {
  color: 'in other colours',
  condition: 'in other conditions',
  size: 'in other sizes',
  minPrice: 'at other prices',
  maxPrice: 'at other prices',
  keywords: 'matching only some of your words',
  gender: 'for both boys and girls',
  type: 'of any item type',
};

const joinList = items =>
  items.length <= 1
    ? items[0] ?? ''
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** The sentence for an AI search that had to drop some filters to find anything. */
export const widenedText = relaxed => {
  const phrases = [...new Set((relaxed || []).map(key => WIDENED[key]).filter(Boolean))];
  return phrases.length
    ? `We don't have exactly that, but here are similar items ${joinList(phrases)}.`
    : "We don't have exactly that, but here are the closest items we have.";
};

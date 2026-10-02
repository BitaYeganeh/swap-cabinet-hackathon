import { widenedText } from './widened';

describe('widenedText', () => {
  it('names what was widened', () => {
    expect(widenedText(['color'])).toBe(
      "We don't have exactly that, but here are similar items in other colours."
    );
  });

  it('joins several phrases and merges duplicates', () => {
    expect(widenedText(['color', 'minPrice', 'maxPrice', 'size'])).toBe(
      "We don't have exactly that, but here are similar items in other colours, at other prices and in other sizes."
    );
  });

  it('falls back to a generic sentence for unknown or no keys', () => {
    const generic = "We don't have exactly that, but here are the closest items we have.";
    expect(widenedText(['mystery'])).toBe(generic);
    expect(widenedText([])).toBe(generic);
  });
});

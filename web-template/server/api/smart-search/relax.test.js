const { RELAX_ORDER, canDrop } = require('./relax');

describe('canDrop', () => {
  it('never drops the sole descriptor ("pink socks" -> only keywords left)', () => {
    expect(canDrop({ color: 'pink', keywords: 'socks' }, 'keywords')).toBe(true);
    expect(canDrop({ keywords: 'socks' }, 'keywords')).toBe(false);
    expect(canDrop({ category: 'women', sort: 'newest', keywords: 'socks' }, 'keywords')).toBe(false);
  });

  it('does not count gender as a describing key (kids case)', () => {
    const current = { category: 'kids', gender: 'girls', color: 'pink', keywords: 'socks' };
    for (const key of RELAX_ORDER) {
      if (!(key in current)) continue;
      if (!canDrop(current, key)) break;
      delete current[key];
    }
    expect(current.keywords).toBe('socks');
    expect(canDrop({ category: 'kids', gender: 'girls', keywords: 'socks' }, 'keywords')).toBe(false);
  });

  it('allows dropping a key while another describing key remains', () => {
    expect(canDrop({ category: 'kids', color: 'pink', type: 'shoes' }, 'color')).toBe(true);
  });

  it('relaxing "pink socks" in order stops before widening to everything', () => {
    const current = { category: 'women', color: 'pink', keywords: 'socks' };
    for (const key of RELAX_ORDER) {
      if (!(key in current)) continue;
      if (!canDrop(current, key)) break;
      delete current[key];
    }
    expect(current).toEqual({ category: 'women', keywords: 'socks' });
  });
});

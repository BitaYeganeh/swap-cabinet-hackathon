// The heavy parts (Claude, CLIP, LanceDB) are replaced; only the answer shape is tested.
jest.mock('./vector-store/labels', () => ({ labelPhoto: jest.fn() }));
jest.mock('./vector-store/embed', () => ({ imageVector: jest.fn() }));
jest.mock('./vector-store/store', () => ({ store: { all: jest.fn() } }));

const { shapeAnswer } = require('./photo-search');
const { rankPhotoSearch } = require('./vector-store/rank');

const jeans = {
  group: 'bottoms',
  kind: 'jeans',
  brand: 'Levi',
  model: '501',
  style: null,
  material: 'denim',
  pattern: null,
  details: [],
  color: 'blue',
};
const tee = { ...jeans, kind: 't-shirt', group: 'tops', brand: null, model: null, material: 'cotton' };

const row = (id, title, item, extra = {}) => ({
  id,
  title,
  listingType: 'sell-clothing',
  items: [item],
  hasPhoto: true,
  photoVector: [1, 0],
  clipTextVector: [0, 0],
  ...extra,
});

const rows = [
  row('a', 'Levi 501 jeans', jeans),
  row('b', 'Slim jeans', { ...jeans, brand: null, model: null }),
  row('c', 'White tee', tee),
  row('w1', 'Looking for 501 jeans', jeans, { listingType: 'in-search-of-clothing' }),
  row('w2', 'Looking for a tee', tee, { listingType: 'in-search-of-clothing' }),
];

describe('shapeAnswer', () => {
  it('returns the selected labels, wanted listings with titles and the search url', () => {
    const ranked = rankPhotoSearch({ queryItem: jeans, queryVector: [1, 0], rows });
    const answer = shapeAnswer({ items: [jeans, tee], selected: 0, queryItem: jeans, ranked, rows });

    expect(answer.labels).toBe(jeans);
    expect(answer.fallback).toBe(false);
    expect(answer.selected).toBe(0);
    // Only the wanted listing for the same kind of item, never in the results.
    expect(answer.wanted).toEqual([{ id: 'w1', title: 'Looking for 501 jeans' }]);
    expect(answer.groups).toEqual([
      { key: 'same', count: 1 },
      { key: 'exact', count: 1 },
      { key: 'other', count: 1 },
    ]);
    expect(answer.url).toBe(`/s?${new URLSearchParams({ ids: 'a,b,c' })}`);
  });

  it('marks a search without labels as a fallback with no wanted listings', () => {
    const ranked = rankPhotoSearch({ queryItem: null, queryVector: [1, 0], rows });
    const answer = shapeAnswer({ items: null, selected: 0, queryItem: null, ranked, rows });

    expect(answer.fallback).toBe(true);
    expect(answer.labels).toBeNull();
    expect(answer.items).toEqual([]);
    expect(answer.wanted).toEqual([]);
    expect(answer.groups).toEqual([{ key: 'closest', count: 3 }]);
  });

  it('keeps at most 8 wanted listings, best first', () => {
    const wanted = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, score: 1 - i / 10 }));
    const many = wanted.map(x => row(x.id, `Wanted ${x.id}`, jeans));
    const answer = shapeAnswer({
      items: [jeans],
      selected: 0,
      queryItem: jeans,
      ranked: { groups: [], wanted },
      rows: many,
    });

    expect(answer.wanted).toHaveLength(8);
    expect(answer.wanted[0]).toEqual({ id: 'w0', title: 'Wanted w0' });
    expect(answer.url).toBeNull();
  });
});

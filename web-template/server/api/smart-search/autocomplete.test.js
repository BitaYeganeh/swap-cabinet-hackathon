jest.mock('./keyword-search', () => ({ allListings: jest.fn() }));

const { allListings } = require('./keyword-search');
const { getAutocomplete } = require('./autocomplete');

const listing = (id, title, extra = {}) => ({
  id,
  title,
  description: 'Secondhand clothing',
  category: 'women',
  subcategory: 'women-jackets',
  listingType: 'sell-clothing',
  price: { amount: 2500, currency: 'EUR' },
  image: `https://img.example/${id}.jpg`,
  city: 'Helsinki',
  postcode: '00530',
  street: 'Fleminginkatu',
  country: 'Finland',
  ...extra,
});

const LISTINGS = [
  listing('1', 'Black leather jacket'),
  listing('2', 'Denim jacket', { city: 'Espoo', postcode: '02100', street: 'Tapiontori' }),
  listing('3', 'Looking for a rain jacket', {
    listingType: 'in-search-of-clothing',
    price: null,
    image: null,
  }),
  listing('4', 'Wool sweater', { city: 'Tampere', postcode: '33100', street: 'Hameenkatu' }),
];

beforeEach(() => allListings.mockResolvedValue(LISTINGS));

describe('getAutocomplete', () => {
  it('returns slim items whose title starts a word with the text', async () => {
    const { items, suggestion } = await getAutocomplete('jack');
    expect(items.map(i => i.id).sort()).toEqual(['1', '2', '3']);
    expect(items.find(i => i.id === '1')).toEqual({
      id: '1',
      title: 'Black leather jacket',
      listingType: 'sell-clothing',
      price: { amount: 2500, currency: 'EUR' },
      city: 'Helsinki',
      image: 'https://img.example/1.jpg',
    });
    // Half-typed, not misspelled: no "did you mean".
    expect(suggestion).toBeNull();
  });

  it('keeps wanted listings without price or image', async () => {
    const { items } = await getAutocomplete('rain');
    expect(items).toEqual([
      {
        id: '3',
        title: 'Looking for a rain jacket',
        listingType: 'in-search-of-clothing',
        price: null,
        city: 'Helsinki',
        image: null,
      },
    ]);
  });

  it('offers places with how many listings are there', async () => {
    const { places } = await getAutocomplete('hels');
    expect(places[0]).toEqual({
      kind: 'city',
      value: 'Helsinki',
      city: 'Helsinki',
      count: 2,
      query: 'Helsinki',
    });
  });

  it('suggests a spelling for a finished typo', async () => {
    const { suggestion } = await getAutocomplete('jakcet ');
    expect(suggestion).toBe('jacket');
  });

  it('answers an empty query without loading listings', async () => {
    allListings.mockClear();
    expect(await getAutocomplete('  ')).toEqual({ suggestion: null, items: [], places: [] });
    expect(await getAutocomplete(undefined)).toEqual({ suggestion: null, items: [], places: [] });
    expect(allListings).not.toHaveBeenCalled();
  });
});

import { clearAiResult, readAiResult, searchKey, storeAiResult, toEntry } from './aiResults';

const answer = {
  query: 'something to keep me dry',
  summary: 'Rain jackets and waterproof coats',
  picks: [
    { id: 'a-1', title: 'Rain jacket', reason: 'Waterproof shell' },
    { id: 'b-2', title: 'Trench coat', reason: 'Long and water-repellent' },
  ],
  dropped: [],
  url: '/s?ids=a-1%2Cb-2',
};

describe('aiResults', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it('never stores or matches an entry with an empty key', () => {
    storeAiResult({ ...answer, url: '' });
    expect(window.sessionStorage.getItem('smartSearch:aiResult')).toBeNull();
    window.sessionStorage.setItem('smartSearch:aiResult', JSON.stringify({ key: '', summary: 'x' }));
    expect(readAiResult('')).toBeNull();
    expect(readAiResult('/s')).toBeNull();
  });

  it('makes a stable key from a URL or search string', () => {
    expect(searchKey('/s?b=2&a=1')).toBe('a=1&b=2');
    expect(searchKey('?a=1&b=2&page=3')).toBe('a=1&b=2');
    expect(searchKey('a=1')).toBe('a=1');
    expect(searchKey('/s')).toBe('');
    expect(searchKey(undefined)).toBe('');
    // Pagination links write the comma unencoded.
    expect(searchKey('?ids=a-1,b-2&page=2')).toBe(searchKey('/s?ids=a-1%2Cb-2'));
  });

  it('keeps reasons by listing id', () => {
    expect(toEntry(answer)).toEqual({
      key: 'ids=a-1%2Cb-2',
      query: 'something to keep me dry',
      summary: 'Rain jackets and waterproof coats',
      picks: { 'a-1': 'Waterproof shell', 'b-2': 'Long and water-repellent' },
      dropped: [],
      noPicks: false,
    });
  });

  it('reads the stored answer back on the same search, also on another page', () => {
    storeAiResult(answer);
    expect(readAiResult('?ids=a-1%2Cb-2')?.picks['a-1']).toBe('Waterproof shell');
    expect(readAiResult('?ids=a-1%2Cb-2&page=2')?.summary).toBe(answer.summary);
  });

  it('shows nothing for a different search', () => {
    storeAiResult(answer);
    expect(readAiResult('?keywords=something%20to%20keep%20me%20dry')).toBeNull();
    expect(readAiResult('')).toBeNull();
  });

  it('a newer answer replaces the older one', () => {
    storeAiResult(answer);
    storeAiResult({
      query: 'black sneakers',
      summary: 'Black sneakers',
      picks: [],
      dropped: ['size'],
      noPicks: true,
      url: '/s?pub_color=black',
    });
    expect(readAiResult('?ids=a-1%2Cb-2')).toBeNull();
    const entry = readAiResult('?pub_color=black');
    expect(entry).toMatchObject({ dropped: ['size'], noPicks: true, picks: {} });
  });

  it('clears the stored answer', () => {
    storeAiResult(answer);
    clearAiResult();
    expect(readAiResult('?ids=a-1%2Cb-2')).toBeNull();
  });

  it('ignores broken stored data', () => {
    window.sessionStorage.setItem('smartSearch:aiResult', '{not json');
    expect(readAiResult('?ids=a-1%2Cb-2')).toBeNull();
  });

  it('survives storage that throws', () => {
    const fail = () => {
      throw new Error('blocked');
    };
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(fail);
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(fail);
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail);

    expect(storeAiResult(answer).picks['b-2']).toBe('Long and water-repellent');
    expect(readAiResult('?ids=a-1%2Cb-2')).toBeNull();
    expect(() => clearAiResult()).not.toThrow();
  });
});

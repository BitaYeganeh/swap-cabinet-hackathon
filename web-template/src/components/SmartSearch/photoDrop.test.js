import {
  createDragCounter,
  describeItem,
  isPhoto,
  listenForPhotos,
  markDropHandled,
  offerPhoto,
  wasDropHandled,
} from './photoDrop';

describe('createDragCounter', () => {
  it('stays over the page until every enter has left', () => {
    const counter = createDragCounter();
    expect(counter.enter()).toBe(true); // window
    expect(counter.enter()).toBe(true); // a child element
    expect(counter.leave()).toBe(true); // left the child, still on the page
    expect(counter.leave()).toBe(false); // left the window
  });

  it('never goes below zero and resets on drop', () => {
    const counter = createDragCounter();
    expect(counter.leave()).toBe(false);
    expect(counter.enter()).toBe(true);
    counter.enter();
    expect(counter.reset()).toBe(false);
    expect(counter.leave()).toBe(false);
  });
});

describe('offerPhoto', () => {
  const file = { name: 'jeans.jpg', type: 'image/jpeg' };

  it('is not taken without a search bar', () => {
    expect(offerPhoto(file)).toBe(false);
  });

  it('goes to the first listening search bar only', () => {
    const first = jest.fn();
    const second = jest.fn();
    const stopFirst = listenForPhotos(first);
    const stopSecond = listenForPhotos(second);

    expect(offerPhoto(file)).toBe(true);
    expect(first).toHaveBeenCalledWith(file);
    expect(second).not.toHaveBeenCalled();

    stopFirst();
    stopSecond();
    expect(offerPhoto(file)).toBe(false);
  });
});

describe('isPhoto', () => {
  it('accepts JPG, PNG and WEBP only', () => {
    expect(isPhoto({ type: 'image/png' })).toBe(true);
    expect(isPhoto({ type: 'image/gif' })).toBe(false);
    expect(isPhoto(null)).toBe(false);
  });
});

describe('describeItem', () => {
  const sneaker = { kind: 'hi-top sneaker', brand: 'Converse', model: 'Chuck 70', color: 'black' };

  it('reads brand, model and kind', () => {
    expect(describeItem(sneaker)).toBe('Converse Chuck 70 hi-top sneaker');
  });

  it('puts the color first for the item buttons', () => {
    expect(describeItem(sneaker, true)).toBe('black Converse Chuck 70 hi-top sneaker');
  });

  it('skips unknown labels and reads "other-shoes" as "shoes"', () => {
    expect(describeItem({ kind: 'other-shoes', brand: null, model: null, color: null }, true)).toBe(
      'shoes'
    );
  });
});

describe('markDropHandled / wasDropHandled', () => {
  it('tells a drop the search bar took from one it did not', () => {
    const drop = new Event('drop', { cancelable: true });
    expect(wasDropHandled(drop)).toBe(false);
    markDropHandled(drop);
    expect(wasDropHandled(drop)).toBe(true);
  });

  it('is not fooled by a drop another listener cancelled', () => {
    // The template's Page cancels every drop on the document.
    const drop = new Event('drop', { cancelable: true });
    drop.preventDefault();
    expect(wasDropHandled(drop)).toBe(false);
  });
});

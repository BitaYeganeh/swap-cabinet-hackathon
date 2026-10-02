// Shared by the search bar (SmartSearch) and the page-wide drop overlay
// (PhotoDropOverlay), so a photo dropped anywhere goes through the bar's own
// photo search instead of a second upload implementation.

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const WRONG_TYPE_MESSAGE = 'Use a JPG, PNG or WEBP photo';

export const isPhoto = file => !!file && PHOTO_TYPES.includes(file.type);

export const hasFiles = e => Array.from(e?.dataTransfer?.types || []).includes('Files');

// The search bar marks a drop it handled itself, so the page-wide overlay
// leaves it alone. `defaultPrevented` can't tell us that: the template's Page
// cancels every drop on the document (so a file never replaces the page).
const HANDLED = Symbol('smartSearchDropHandled');

/** Marks a native drop event as handled by the search bar. */
export const markDropHandled = e => {
  e[HANDLED] = true;
};

/** Whether the search bar already handled this native drop event. */
export const wasDropHandled = e => !!e?.[HANDLED];

// A photo dropped on the page is offered to a mounted search bar first.
const PHOTO_EVENT = 'smartsearch:photo';

/**
 * Offers a dropped photo to the search bar on this page.
 * @param {File} file
 * @returns {boolean} true when a search bar took it
 */
export const offerPhoto = file => {
  const detail = { file, taken: false };
  // dispatchEvent runs the listeners right away, so `taken` is set on return.
  window.dispatchEvent(new CustomEvent(PHOTO_EVENT, { detail }));
  return detail.taken;
};

/**
 * Listens for offered photos. Only the first listener takes a photo.
 * Call from an effect (uses window); returns the cleanup function.
 * @param {(file: File) => void} handler
 */
export const listenForPhotos = handler => {
  const onPhoto = e => {
    if (e.detail.taken) return;
    e.detail.taken = true;
    handler(e.detail.file);
  };
  window.addEventListener(PHOTO_EVENT, onPhoto);
  return () => window.removeEventListener(PHOTO_EVENT, onPhoto);
};

/**
 * dragenter/dragleave fire for every child element the drag crosses. Counting
 * them tells when the drag really left the window.
 */
export const createDragCounter = () => {
  let depth = 0;
  return {
    // Each returns whether the drag is still over the page.
    enter: () => {
      depth += 1;
      return true;
    },
    leave: () => {
      depth = Math.max(0, depth - 1);
      return depth > 0;
    },
    reset: () => {
      depth = 0;
      return false;
    },
  };
};

// "other-shoes" (no listed kind fits) reads as "shoes".
const kindText = kind => (kind || '').replace(/^other-/, '');

/**
 * What we read from a photo, e.g. "Converse Chuck 70 hi-top sneaker".
 * @param {Object} item labels of one item
 * @param {boolean} withColor put the color first (tells the items in an outfit apart)
 */
export const describeItem = (item, withColor = false) =>
  [withColor && item?.color, item?.brand, item?.model, kindText(item?.kind)]
    .filter(Boolean)
    .join(' ');

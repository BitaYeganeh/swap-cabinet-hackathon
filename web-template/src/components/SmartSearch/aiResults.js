import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// The last AI search answer, kept for this browser tab so a reload of its
// results page still shows the summary, the notes and a reason on each card.
// The URL only carries the filters (or the picked ids), not the reasons.
// Only one answer is kept: a newer AI search replaces it, and any page whose
// search string does not match it shows nothing.
const STORAGE_KEY = 'smartSearch:aiResult';

// Storage can be missing (server render) or throw (private mode, blocked).
const storage = () => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch (e) {
    return null;
  }
};

/**
 * The search string of a URL in a stable form: params sorted, page number left
 * out (page 2 of the same answer still matches).
 *
 * @param {string} urlOrSearch e.g. '/s?ids=a,b', '?ids=a,b' or 'ids=a,b'
 * @returns {string}
 */
export const searchKey = urlOrSearch => {
  const raw = String(urlOrSearch || '');
  const qIndex = raw.indexOf('?');
  const search = qIndex >= 0 ? raw.slice(qIndex + 1) : raw.startsWith('/') ? '' : raw;
  const params = new URLSearchParams(search);
  params.delete('page');
  params.sort();
  return params.toString();
};

/**
 * Turn the server's answer into what we keep: reasons by listing id.
 *
 * @param {Object} data answer from POST /api/smart-search/ai
 * @returns {Object} { key, query, summary, picks: { [id]: reason }, dropped, noPicks }
 */
export const toEntry = data => ({
  key: searchKey(data?.url),
  query: data?.query || '',
  summary: data?.summary || '',
  picks: Object.fromEntries((data?.picks || []).map(p => [p.id, p.reason])),
  dropped: data?.dropped || [],
  noPicks: !!data?.noPicks,
});

/**
 * Keep an AI answer for this tab, replacing any earlier one.
 *
 * @param {Object} data answer from POST /api/smart-search/ai
 * @returns {Object} the kept entry (also when storage is unavailable)
 */
export const storeAiResult = data => {
  const entry = toEntry(data);
  if (!entry.key) return entry;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch (e) {
    // Storage unavailable: the banner shows now, but not after a reload.
  }
  return entry;
};

/**
 * The kept AI answer, but only if it belongs to this search string.
 *
 * @param {string} search location.search of the current page
 * @returns {Object|null}
 */
export const readAiResult = search => {
  try {
    const entry = JSON.parse(storage()?.getItem(STORAGE_KEY) || 'null');
    if (!entry || typeof entry !== 'object' || !entry.key) return null;
    return entry.key === searchKey(search) ? entry : null;
  } catch (e) {
    return null;
  }
};

/** Forget the kept AI answer (e.g. a photo search replaced it). */
export const clearAiResult = () => {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch (e) {
    // Nothing to do.
  }
};

/**
 * The kept AI answer for the current search page, or null.
 * Storage is read only after mount, so the server render and the first
 * browser render match.
 *
 * @returns {Object|null}
 */
export const useStoredAiResult = () => {
  const location = useLocation();
  const [entry, setEntry] = useState(null);
  useEffect(() => {
    const onSearchPage = location.pathname.startsWith('/s');
    setEntry(onSearchPage ? readAiResult(location.search) : null);
  }, [location.pathname, location.search, location.key]);
  return entry;
};

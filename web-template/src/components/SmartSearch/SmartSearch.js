import React, { useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import { apiBaseUrl } from '../../util/api';
import { parse } from '../../util/urlHelpers';

import { MatrixLoader, ThinkingStatus } from './SmartSearchMotion';

import css from './SmartSearch.module.css';

// Names for the filters the AI search may drop when nothing matches.
const FILTER_NAMES = {
  color: 'colour',
  condition: 'condition',
  size: 'size',
  minPrice: 'minimum price',
  maxPrice: 'maximum price',
  keywords: 'keywords',
  gender: 'boys/girls',
  type: 'item type',
};

const GROUP_NAMES = {
  same: 'same model',
  exact: 'same kind',
  close: 'similar',
  other: 'other',
  closest: 'closest look',
};

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// What the status line says while a search runs (what the server is doing, in order).
const AI_STATES = [
  'Reading what you need',
  'Turning it into filters',
  'Checking what is in stock',
  'Picking the best matches',
];
const PHOTO_STATES = [
  'Looking at your photo',
  'Spotting the clothing item',
  'Comparing it with every listing',
  'Ranking the closest matches',
];

const postJson = (path, body) =>
  fetch(`${apiBaseUrl()}/api/smart-search${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const postPhoto = (file, item) => {
  const form = new FormData();
  form.append('photo', file);
  form.append('item', String(item));
  return fetch(`${apiBaseUrl()}/api/smart-search/photo`, { method: 'POST', body: form });
};

const readAnswer = async response => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.message || 'Search failed');
  return data;
};

/**
 * Smart Search: describe what you want in your own words, or search with a photo.
 * Both answers are a normal search page URL, so the results use the template's
 * own search page, listing cards and pagination.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to component's own css.root
 * @returns {JSX.Element}
 */
const SmartSearch = props => {
  const { className } = props;
  const history = useHistory();
  const location = useLocation();
  const fileInput = useRef(null);

  // A search started on another page (e.g. the landing page hero) arrives here
  // with its answer in the location state, so the summary is still shown.
  const carried = location.state?.smartSearch || {};

  const [query, setQuery] = useState(carried.query || '');
  const [busy, setBusy] = useState(null); // 'ai' | 'photo' | null
  const [error, setError] = useState(null);
  const [aiResult, setAiResult] = useState(carried.aiResult || null);
  const [photo, setPhoto] = useState(carried.photo || null); // { file, preview, result }
  const [dragging, setDragging] = useState(false);

  const go = (url, smartSearch) => {
    if (url) history.push(url, { smartSearch });
  };

  const handleAiSearch = async e => {
    e.preventDefault();
    if (!query.trim() || busy) return;
    setBusy('ai');
    setError(null);
    setPhoto(null);
    try {
      const data = await readAnswer(await postJson('/ai', { query }));
      setAiResult(data);
      go(data.url, { query, aiResult: data });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const searchPhoto = async (file, item = 0, preview = photo?.preview) => {
    setBusy('photo');
    setError(null);
    setAiResult(null);
    try {
      const data = await readAnswer(await postPhoto(file, item));
      setPhoto(prev => ({ ...prev, file, result: data }));
      if (data.noClothing) setError("We couldn't see a clothing item in this photo.");
      go(data.url, { photo: { file, preview, result: data } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const startPhotoSearch = file => {
    if (!file || busy) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setError('Use a JPG, PNG or WEBP photo');
      return;
    }
    const preview = URL.createObjectURL(file);
    setPhoto({ file, preview, result: null });
    searchPhoto(file, 0, preview);
  };

  const handlePhotoChosen = e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    startPhotoSearch(file);
  };

  // Drag and drop a photo anywhere on the search bar.
  const hasFiles = e => Array.from(e.dataTransfer?.types || []).includes('Files');
  const handleDragOver = e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!dragging) setDragging(true);
  };
  const handleDragLeave = e => {
    // Only when leaving the bar itself, not when moving between its children.
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
  };
  const handleDrop = e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragging(false);
    startPhotoSearch(e.dataTransfer.files?.[0]);
  };

  // The keyword search fixed a spelling ("jakcet" -> "jacket") on the search page.
  const suggestion = useSelector(state => state.SearchPage?.smartSearchSuggestion);
  const typedKeywords = parse(location.search)?.keywords;
  const showSuggestion = suggestion && typedKeywords && location.pathname.startsWith('/s');

  const dropped = aiResult?.dropped || [];
  const photoResult = photo?.result;

  return (
    <div
      className={classNames(css.root, className, { [css.dragging]: dragging })}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <form className={css.form} onSubmit={handleAiSearch}>
        <input
          className={css.input}
          type="search"
          value={query}
          maxLength={200}
          onChange={e => setQuery(e.target.value)}
          placeholder={
            dragging
              ? 'Drop your photo to search with it'
              : 'Describe what you need, or drop a photo here'
          }
          aria-label="Describe what you are looking for"
        />
        <button className={css.searchButton} type="submit" disabled={!!busy || !query.trim()}>
          {busy === 'ai' ? (
            <span className={css.buttonBusy}>
              <MatrixLoader variant="scan" className={css.buttonLoader} />
              Searching
            </span>
          ) : (
            'Smart search'
          )}
        </button>
        <button
          className={css.photoButton}
          type="button"
          disabled={!!busy}
          onClick={() => fileInput.current?.click()}
          title="Search with a photo"
        >
          {busy === 'photo' ? (
            <span className={css.buttonBusy}>
              <MatrixLoader variant="orbit" />
              Looking
            </span>
          ) : (
            '📷 Photo'
          )}
        </button>
        <input
          ref={fileInput}
          className={css.hiddenInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChosen}
        />
      </form>

      <div className={css.dropOverlay} aria-hidden={!dragging}>
        <span className={css.dropIcon}>📷</span>
        <span className={css.dropTitle}>Drop your photo to search</span>
        <span className={css.dropHint}>JPG, PNG or WEBP · we find items that look like it</span>
      </div>

      {busy ? (
        <div className={css.loading}>
          {busy === 'photo' && photo?.preview ? (
            <span className={css.scanThumb}>
              <img src={photo.preview} alt="" />
            </span>
          ) : (
            <MatrixLoader variant="twinkle" />
          )}
          <ThinkingStatus states={busy === 'photo' ? PHOTO_STATES : AI_STATES} />
        </div>
      ) : null}

      {error ? <p className={css.error}>{error}</p> : null}

      {showSuggestion ? (
        <p className={css.suggestion}>
          Showing results for <strong>{suggestion}</strong> (you typed “{typedKeywords}”)
        </p>
      ) : null}

      {aiResult && !busy ? (
        <div className={css.info}>
          <strong>{aiResult.summary}</strong>
          {dropped.length > 0 ? (
            <span>
              {' '}
              · Nothing matched exactly, so we left out:{' '}
              {dropped.map(key => FILTER_NAMES[key] || key).join(', ')}
            </span>
          ) : null}
          {aiResult.picks?.length > 0 ? (
            <ul className={css.picks}>
              {aiResult.picks.map(p => (
                <li key={p.id}>
                  <strong>{p.title}</strong>: {p.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {photo && !busy ? (
        <div className={css.info}>
          <div className={css.photoRow}>
            {photo.preview ? <img className={css.preview} src={photo.preview} alt="" /> : null}
            <div>
              {photoResult?.items?.length > 0 ? (
                <>
                  <span>Searching for: </span>
                  {photoResult.items.map((item, i) => (
                    <button
                      key={`${item.kind}-${i}`}
                      type="button"
                      className={classNames(css.chip, {
                        [css.chipSelected]: i === photoResult.selected,
                      })}
                      disabled={!!busy}
                      onClick={() => searchPhoto(photo.file, i)}
                    >
                      {[item.color, item.brand, item.kind].filter(Boolean).join(' ')}
                    </button>
                  ))}
                </>
              ) : null}
              {photoResult?.groups?.length > 0 ? (
                <p className={css.groups}>
                  {photoResult.groups
                    .map(g => `${g.count} ${GROUP_NAMES[g.key] || g.key}`)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SmartSearch;

import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import { apiBaseUrl } from '../../util/api';
import { createSlug, parse } from '../../util/urlHelpers';
import { createResourceLocatorString } from '../../util/routes';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';

import { widenedText } from './widened';
import { clearAiResult, storeAiResult, useStoredAiResult } from './aiResults';
import { MatrixLoader, ThinkingStatus } from './SmartSearchMotion';
import Suggestions, { toOptions, useAutocomplete } from './Suggestions';

import css from './SmartSearch.module.css';

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
  const routeConfiguration = useRouteConfiguration();
  const fileInput = useRef(null);
  const rootRef = useRef(null);
  const listboxId = useId();

  // A photo search started on another page (e.g. the landing page hero) arrives
  // here with its answer in the location state (a photo can't be stored).
  const carried = location.state?.smartSearch || {};
  // An AI answer is kept in sessionStorage for the URL it led to, so a reload
  // or Back still shows it, and any other search shows nothing.
  const aiResult = useStoredAiResult();

  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(null); // 'ai' | 'photo' | null
  const [error, setError] = useState(null);
  const [photo, setPhoto] = useState(carried.photo || null); // { file, preview, result }
  const [dragging, setDragging] = useState(false);
  // Suggestions dropdown while typing; `active` is the highlighted row (-1: none).
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Phones and tablets can't drag files, but their photo picker offers the camera.
  // Set after the first render, so the server-rendered page matches.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia?.('(pointer: coarse)').matches || false);
  }, []);
  // After a reload the box is empty: fill it with the restored AI query.
  useEffect(() => {
    if (aiResult?.query) setQuery(prev => prev || aiResult.query);
  }, [aiResult]);

  const go = (url, smartSearch) => {
    if (url) history.push(url, { smartSearch });
  };

  // Never during an AI or photo search, nor while a photo is dragged over the bar.
  const typing = open && !busy;
  const options = toOptions(useAutocomplete(query, typing));
  const expanded = typing && !dragging && options.length > 0;
  const optionId = i => `${listboxId}-option-${i}`;

  const closeSuggestions = () => {
    setOpen(false);
    setActive(-1);
  };

  // Clicking or tapping anywhere outside the bar closes the dropdown.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = e => {
      if (!rootRef.current?.contains(e.target)) closeSuggestions();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  const keywordSearch = keywords => {
    // A kept AI answer belongs to its own URL, so Back still shows it.
    setQuery(keywords);
    setError(null);
    setPhoto(null);
    history.push(createResourceLocatorString('SearchPage', routeConfiguration, {}, { keywords }));
  };

  // A picked item opens its listing page; a spelling or a place searches for it.
  const choose = option => {
    closeSuggestions();
    if (option.kind === 'item') {
      const { id, title } = option.item;
      history.push(
        createResourceLocatorString(
          'ListingPage',
          routeConfiguration,
          { id, slug: createSlug(title || 'listing') },
          {}
        )
      );
    } else if (option.kind === 'place') {
      keywordSearch(option.place.query);
    } else if (option.kind === 'suggestion') {
      keywordSearch(option.text);
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (busy) return;
      e.preventDefault();
      if (!expanded) {
        setOpen(true);
        return;
      }
      // Cycle through the rows and back to the input (-1).
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive(i => {
        const next = i + step;
        if (next >= options.length) return -1;
        if (next < -1) return options.length - 1;
        return next;
      });
    } else if (e.key === 'Enter' && expanded && active >= 0 && options[active]) {
      // Enter on a highlighted row picks it instead of running the AI search.
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape' && open) {
      // Keep the typed text: Escape only closes the dropdown.
      e.preventDefault();
      closeSuggestions();
    }
  };

  const handleAiSearch = async e => {
    e.preventDefault();
    if (!query.trim() || busy) return;
    closeSuggestions();
    setBusy('ai');
    setError(null);
    setPhoto(null);
    try {
      const data = await readAnswer(await postJson('/ai', { query }));
      storeAiResult({ ...data, query: data.query || query });
      go(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const searchPhoto = async (file, item = 0, preview = photo?.preview) => {
    setBusy('photo');
    setError(null);
    try {
      const data = await readAnswer(await postPhoto(file, item));
      clearAiResult();
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
    closeSuggestions();
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
  const onSearchPage = location.pathname.startsWith('/s');
  const showSuggestion = suggestion && typedKeywords && onSearchPage;
  // No listing mentions the typed words, so all results are matches by meaning.
  const similarOnly = useSelector(state => state.SearchPage?.smartSearchSimilarOnly);
  const showSimilarOnly = similarOnly && typedKeywords && onSearchPage;

  const dropped = aiResult?.dropped || [];
  const photoResult = photo?.result;
  const exactQuery = aiResult?.query || query;

  return (
    <div
      ref={rootRef}
      className={classNames(css.root, className, { [css.dragging]: dragging })}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <form
        className={css.form}
        onSubmit={handleAiSearch}
        onBlur={e => {
          // Focus left the bar (e.g. Tab away): close the dropdown.
          if (!e.currentTarget.contains(e.relatedTarget)) closeSuggestions();
        }}
      >
        <div className={css.inputWrap}>
          <input
            className={css.input}
            type="search"
            value={query}
            maxLength={200}
            onChange={e => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listboxId}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            placeholder={
              dragging
                ? 'Drop your photo to search with it'
                : isTouch
                ? 'Describe what you need, or snap a photo'
                : 'Describe what you need, or drop a photo here'
            }
            aria-label="Describe what you are looking for"
          />
          {expanded ? (
            <Suggestions
              id={listboxId}
              options={options}
              active={active}
              typed={query}
              optionId={optionId}
              onChoose={choose}
              onHover={setActive}
            />
          ) : null}
        </div>
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
          onClick={() => {
            closeSuggestions();
            fileInput.current?.click();
          }}
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

      {showSimilarOnly ? (
        <p className={css.note}>
          No item mentions these words, so here are items similar in meaning.
        </p>
      ) : null}

      {aiResult && !busy ? (
        <div className={css.info}>
          <strong>{aiResult.summary}</strong>
          {dropped.length > 0 ? <span> · {widenedText(dropped)}</span> : null}
          {aiResult.noPicks ? (
            <span>
              {' '}
              · Nothing in the shop is a clear fit yet, so these are the closest matches by keyword.
            </span>
          ) : null}
          {exactQuery ? (
            <p className={css.exactLink}>
              <Link to={`/s?keywords=${encodeURIComponent(exactQuery)}`}>
                Search the exact words instead
              </Link>
            </p>
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

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
import {
  PHOTO_TYPES,
  WRONG_TYPE_MESSAGE,
  describeItem,
  hasFiles,
  isPhoto,
  listenForPhotos,
  markDropHandled,
} from './photoDrop';
import { AI_EXAMPLES, examplePlaceholder, useTypedExample } from './aiExamples';
import { AI_TIMEOUT_MS, TIMEOUT_NOTE, shouldUseAi } from './searchMode';

import css from './SmartSearch.module.css';

const GROUP_NAMES = {
  same: 'same model',
  exact: 'same kind',
  close: 'similar',
  other: 'other',
  closest: 'closest look',
};

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

const postJson = (path, body, signal) =>
  fetch(`${apiBaseUrl()}/api/smart-search${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
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
  // A one-shot note carried by a navigation (e.g. the AI search timed out).
  const notice = carried.notice;
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
  const [focused, setFocused] = useState(false);
  // The AI search in progress, so the cancel button and leaving the page can stop it.
  const aiRequest = useRef(null);
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

  const keywordSearch = (keywords, note) => {
    // A kept AI answer belongs to its own URL, so Back still shows it.
    setQuery(keywords);
    setError(null);
    setPhoto(null);
    history.push(
      createResourceLocatorString('SearchPage', routeConfiguration, {}, { keywords }),
      note ? { smartSearch: { notice: note } } : undefined
    );
  };

  // Stop the running AI search (if any) without navigating anywhere.
  const abortAi = () => {
    const running = aiRequest.current;
    aiRequest.current = null;
    running?.abort();
  };
  const cancelAi = () => {
    abortAi();
    setBusy(b => (b === 'ai' ? null : b));
  };
  // Leaving the page (another URL, or unmount) stops a running AI search too.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => cancelAi, [location.pathname, location.search]);

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
      // Enter on a highlighted row picks it instead of running the search.
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape' && open) {
      // Keep the typed text: Escape only closes the dropdown.
      e.preventDefault();
      closeSuggestions();
    }
  };

  const runAiSearch = async text => {
    abortAi();
    const controller = new AbortController();
    aiRequest.current = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, AI_TIMEOUT_MS);
    closeSuggestions();
    setBusy('ai');
    setError(null);
    setPhoto(null);
    try {
      const data = await readAnswer(await postJson('/ai', { query: text }, controller.signal));
      if (aiRequest.current !== controller) return; // cancelled meanwhile
      storeAiResult({ ...data, query: data.query || text });
      go(data.url);
    } catch (err) {
      if (timedOut) {
        // Too slow: the shopper still gets results, from the keyword search.
        keywordSearch(text, TIMEOUT_NOTE);
      } else if (!controller.signal.aborted) {
        setError(err.message);
      }
    } finally {
      clearTimeout(timer);
      if (aiRequest.current === controller) {
        aiRequest.current = null;
        setBusy(null);
      }
    }
  };

  // One box: 2+ words go to the AI search, a single word to the keyword search.
  const handleSubmit = e => {
    e.preventDefault();
    const text = query.trim();
    if (!text || busy) return;
    closeSuggestions();
    if (shouldUseAi(text)) runAiSearch(text);
    else keywordSearch(text);
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
    if (!isPhoto(file)) {
      setError(WRONG_TYPE_MESSAGE);
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

  // A photo dropped elsewhere on the page (PhotoDropOverlay) comes here, so it
  // runs the same photo search. The listener reads the latest state via a ref.
  const startPhotoRef = useRef(startPhotoSearch);
  startPhotoRef.current = startPhotoSearch;
  useEffect(() => listenForPhotos(file => startPhotoRef.current(file)), []);
  // A photo dropped on a page without a search bar opened this page with it.
  useEffect(() => {
    const pending = history.location.state?.smartSearch?.pendingPhoto;
    if (!pending) return;
    // Cleared first, so a reload or a second effect run doesn't search again.
    const { pathname, search, hash } = history.location;
    history.replace({ pathname, search, hash }, {});
    startPhotoRef.current(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag and drop a photo anywhere on the search bar.
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
    markDropHandled(e.nativeEvent); // so the page-wide overlay doesn't search too
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

  // The empty, idle box types out example AI searches as its placeholder.
  const { typed: typedExample, reduced } = useTypedExample(
    !focused && !query && !busy && !dragging
  );
  const photoHint = isTouch ? 'or snap a photo' : 'or drop a photo here';
  const placeholder = dragging
    ? 'Drop your photo to search with it'
    : typedExample
    ? typedExample
    : reduced && !focused && !busy
    ? `${examplePlaceholder(AI_EXAMPLES[0])}, ${photoHint}`
    : `Describe what you need, ${photoHint}`;
  const aiMode = shouldUseAi(query);

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
        onSubmit={handleSubmit}
        onBlur={e => {
          // Focus left the bar (e.g. Tab away): close the dropdown.
          if (!e.currentTarget.contains(e.relatedTarget)) closeSuggestions();
        }}
      >
        <div className={css.inputWrap}>
          <input
            className={classNames(css.input, { [css.inputWithCancel]: busy === 'ai' })}
            type="search"
            value={query}
            maxLength={200}
            onChange={e => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listboxId}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            placeholder={placeholder}
            aria-label="Describe what you are looking for"
          />
          {busy === 'ai' ? (
            <button
              className={css.cancelButton}
              type="button"
              onClick={cancelAi}
              aria-label="Cancel AI search"
              title="Cancel"
            >
              ✕
            </button>
          ) : null}
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
          ) : aiMode ? (
            'Smart search'
          ) : (
            'Search'
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
          accept={PHOTO_TYPES.join(',')}
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

      {notice && !busy ? <p className={css.note}>{notice}</p> : null}

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

      {photo && !busy && photoResult ? (
        <div className={css.info}>
          <div className={css.photoRow}>
            {photo.preview ? <img className={css.preview} src={photo.preview} alt="" /> : null}
            <div>
              {photoResult.items?.length === 1 ? (
                <span>
                  We see: <strong>{describeItem(photoResult.items[0])}</strong>
                </span>
              ) : null}
              {photoResult.items?.length > 1 ? (
                <>
                  <p className={css.question}>We see more than one item. Which one do you want?</p>
                  <div className={css.chips} role="group" aria-label="Item to search for">
                    {photoResult.items.map((item, i) => (
                      <button
                        key={`${item.kind}-${i}`}
                        type="button"
                        className={classNames(css.chip, {
                          [css.chipSelected]: i === photoResult.selected,
                        })}
                        aria-pressed={i === photoResult.selected}
                        disabled={!!busy}
                        onClick={() => {
                          if (i !== photoResult.selected) searchPhoto(photo.file, i);
                        }}
                      >
                        {describeItem(item, true)}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              {photoResult.fallback ? (
                <p className={css.note}>Showing the items that look most alike.</p>
              ) : null}
              {photoResult.groups?.length > 0 ? (
                <p className={css.groups}>
                  {photoResult.groups
                    .map(g => `${g.count} ${GROUP_NAMES[g.key] || g.key}`)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
          </div>
          {photoResult.wanted?.length > 0 ? (
            <div className={css.wanted}>
              <p className={css.wantedTitle}>People also look for this</p>
              <ul className={css.wantedList}>
                {photoResult.wanted.map(({ id, title }) => (
                  <li key={id}>
                    <Link
                      to={createResourceLocatorString(
                        'ListingPage',
                        routeConfiguration,
                        { id, slug: createSlug(title || 'listing') },
                        {}
                      )}
                    >
                      {title || 'Looking for…'}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default SmartSearch;

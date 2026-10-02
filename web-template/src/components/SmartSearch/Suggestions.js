import React, { useEffect, useState } from 'react';
import classNames from 'classnames';

import { apiBaseUrl } from '../../util/api';
import { useIntl } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';

import css from './Suggestions.module.css';

const { Money } = sdkTypes;

const DEBOUNCE_MS = 150;
const EMPTY = { suggestion: null, items: [], places: [] };
export const WANTED_TYPE = 'in-search-of-clothing';

const PLACE_KIND_LABEL = { city: 'City', postcode: 'Postcode', street: 'Street' };

/**
 * Suggestions for `text`, fetched after a short pause in typing. A newer text
 * aborts the request for the older one. Fetches only while `enabled`.
 */
export const useAutocomplete = (text, enabled) => {
  const [result, setResult] = useState({ q: '', data: EMPTY });
  const q = text.trim();

  useEffect(() => {
    if (!q || !enabled) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`${apiBaseUrl()}/api/smart-search/autocomplete?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then(response => (response.ok ? response.json() : null))
        .then(data => {
          if (data?.success) {
            const { suggestion = null, items = [], places = [] } = data;
            setResult({ q, data: { suggestion, items, places } });
          }
        })
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, enabled]);

  // Keep showing the previous suggestions while the next ones load.
  return q ? result.data : EMPTY;
};

/** The rows of the dropdown, in display (and arrow key) order. */
export const toOptions = ({ suggestion, items, places }) => [
  ...(suggestion ? [{ kind: 'suggestion', text: suggestion }] : []),
  ...items.map(item => ({ kind: 'item', item })),
  ...places.map(place => ({ kind: 'place', place })),
];

// Bold the part of `text` that starts with the word being typed.
const Highlight = ({ text, typed }) => {
  const last =
    typed
      .trim()
      .split(/\s+/)
      .pop() || '';
  if (!last) return text;
  const escaped = last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})`, 'iu').exec(text);
  if (!match) return text;
  const start = match.index + match[1].length;
  const end = start + match[2].length;
  return (
    <>
      {text.slice(0, start)}
      <strong>{text.slice(start, end)}</strong>
      {text.slice(end)}
    </>
  );
};

const placeLabel = place =>
  place.kind === 'city' || !place.city ? place.value : `${place.value}, ${place.city}`;

const priceText = (intl, item) => {
  if (item.listingType === WANTED_TYPE) return 'Wanted';
  if (!item.price) return '';
  try {
    return formatMoney(intl, new Money(item.price.amount, item.price.currency));
  } catch (e) {
    // A currency the template has no formatting for.
    return `${(item.price.amount / 100).toFixed(2)} ${item.price.currency}`;
  }
};

/**
 * The dropdown under the search box: a "Did you mean" row, matching items and
 * places. The input owns focus and keyboard; rows only report hover and click.
 *
 * @component
 * @param {Object} props
 * @param {string} props.id listbox id, referenced by the input's aria-controls
 * @param {Array} props.options rows from toOptions
 * @param {number} props.active index of the highlighted row, -1 for none
 * @param {string} props.typed what is in the search box
 * @param {Function} props.optionId row index -> element id (aria-activedescendant)
 * @param {Function} props.onChoose called with the picked option
 * @param {Function} props.onHover called with the hovered row index
 * @returns {JSX.Element}
 */
const Suggestions = props => {
  const { id, options, active, typed, optionId, onChoose, onHover } = props;
  const intl = useIntl();

  const rowProps = i => ({
    id: optionId(i),
    role: 'option',
    'aria-selected': i === active,
    // mousedown would blur the input before the click lands.
    onMouseDown: e => e.preventDefault(),
    onMouseEnter: () => onHover(i),
    onClick: () => onChoose(options[i]),
    className: classNames(css.row, { [css.rowActive]: i === active }),
  });

  const rows = options.map((option, i) => ({ option, i }));
  const suggestionRow = rows.find(r => r.option.kind === 'suggestion');
  const itemRows = rows.filter(r => r.option.kind === 'item');
  const placeRows = rows.filter(r => r.option.kind === 'place');

  const section = (title, list) =>
    list.length > 0 ? (
      <li role="presentation">
        <p className={css.sectionTitle} aria-hidden="true">
          {title}
        </p>
        <ul role="group" aria-label={title} className={css.group}>
          {list}
        </ul>
      </li>
    ) : null;

  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Search suggestions"
      className={css.root}
      onMouseDown={e => e.preventDefault()}
    >
      {suggestionRow ? (
        <li role="presentation" className={css.suggestionSection}>
          <ul role="group" aria-label="Spelling suggestion" className={css.group}>
            <li {...rowProps(suggestionRow.i)}>
              <span className={classNames(css.icon, css.iconAccent)} aria-hidden="true">
                ✨
              </span>
              <span className={css.text}>
                Did you mean <strong className={css.accent}>“{suggestionRow.option.text}”</strong>?
              </span>
            </li>
          </ul>
        </li>
      ) : null}

      {section(
        'Items',
        itemRows.map(({ option: { item }, i }) => {
          const meta = [priceText(intl, item), item.city].filter(Boolean).join(' · ');
          return (
            <li key={item.id} {...rowProps(i)}>
              <span className={css.icon} aria-hidden="true">
                {item.image ? <img src={item.image} alt="" className={css.thumb} /> : '👕'}
              </span>
              <span className={css.text}>
                <span className={css.title}>
                  <Highlight text={item.title} typed={typed} />
                </span>
                {meta ? <span className={css.meta}>{meta}</span> : null}
              </span>
            </li>
          );
        })
      )}

      {section(
        'Locations',
        placeRows.map(({ option: { place }, i }) => (
          <li key={`${place.kind}:${place.value}`} {...rowProps(i)}>
            <span className={classNames(css.icon, css.iconAccent)} aria-hidden="true">
              📍
            </span>
            <span className={css.text}>
              <span className={css.title}>
                {place.query !== place.value
                  ? `${place.query.slice(0, -place.value.length)}in `
                  : null}
                <Highlight text={placeLabel(place)} typed={typed} />
              </span>
              <span className={css.meta}>
                {PLACE_KIND_LABEL[place.kind] || place.kind}
                {place.count != null
                  ? ` · ${place.count} ${place.count === 1 ? 'item' : 'items'}`
                  : null}
              </span>
            </span>
          </li>
        ))
      )}
    </ul>
  );
};

export default Suggestions;

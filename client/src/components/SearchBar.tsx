import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SubmitEvent,
} from "react";
import { LuMapPin, LuSearch, LuSparkles, LuX } from "react-icons/lu";
import { PiCoatHanger } from "react-icons/pi";
import { useNavigate } from "react-router";
import {
  getAutocomplete,
  type AutocompleteItem,
  type AutocompletePlace,
  type AutocompleteResponse,
} from "../lib/api";
import { formatMoney, WANTED_TYPE } from "../lib/format";
import { browseUrl } from "../lib/search";

const DEBOUNCE_MS = 150;
const EMPTY: AutocompleteResponse = { items: [], places: [] };

type Option =
  | { kind: "suggestion"; text: string }
  | { kind: "item"; item: AutocompleteItem }
  | { kind: "place"; place: AutocompletePlace }
  | { kind: "search" };

// Suggestions for `text`, fetched after a short pause in typing.
function useAutocomplete(text: string, category?: string) {
  const [result, setResult] = useState({ q: "", data: EMPTY });
  const q = text.trim();

  useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      getAutocomplete(q, category, controller.signal)
        .then((data) => setResult({ q, data }))
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, category]);

  // Keep showing the previous suggestions while the next ones load.
  return q ? result.data : EMPTY;
}

// Bold the part of `text` that starts with the word being typed.
function Highlight({ text, typed }: { text: string; typed: string }) {
  const last = typed.trim().split(/\s+/).pop() ?? "";
  if (!last) return <>{text}</>;
  const escaped = last.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})`, "iu").exec(text);
  if (!match) return <>{text}</>;
  const start = match.index + match[1].length;
  const end = start + match[2].length;
  return (
    <>
      {text.slice(0, start)}
      <strong className="font-bold text-ink">{text.slice(start, end)}</strong>
      {text.slice(end)}
    </>
  );
}

const PLACE_KIND_LABEL = { city: "City", postcode: "Postcode", street: "Street" };

function placeLabel(place: AutocompletePlace) {
  const where = place.kind === "city" || !place.city ? "" : `, ${place.city}`;
  return `${place.value}${where}`;
}

export default function SearchBar({
  initial,
  category,
  current,
}: {
  initial: string;
  category?: string;
  current: URLSearchParams;
}) {
  const navigate = useNavigate();
  const listboxId = useId();
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { items, places, suggestion } = useAutocomplete(text, category);

  const q = text.trim();
  const options: Option[] = [
    ...(suggestion ? [{ kind: "suggestion" as const, text: suggestion }] : []),
    ...items.map((item) => ({ kind: "item" as const, item })),
    ...places.map((place) => ({ kind: "place" as const, place })),
    ...(q ? [{ kind: "search" as const }] : []),
  ];
  const expanded = open && options.length > 0;
  const optionId = (i: number) => `${listboxId}-${i}`;

  const search = (keywords: string) => {
    setOpen(false);
    navigate(browseUrl(current, { keywords: keywords.trim() }));
  };

  const choose = (option: Option) => {
    setOpen(false);
    if (option.kind === "suggestion") {
      setText(option.text);
      search(option.text);
    }
    // No item pages: picking an item searches for it on the page.
    else if (option.kind === "item") search(option.item.title);
    else if (option.kind === "place") search(option.place.query);
    else search(text);
  };

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (expanded && active >= 0 && options[active]) choose(options[active]);
    else search(text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!expanded) {
        setOpen(true);
        return;
      }
      // Cycle through the rows and back to the input (-1).
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => {
        const next = i + step;
        if (next >= options.length) return -1;
        if (next < -1) return options.length - 1;
        return next;
      });
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  // Option index -> props shared by every row (hover, click, ARIA).
  const rowProps = (i: number) => ({
    id: optionId(i),
    role: "option",
    "aria-selected": i === active,
    // mousedown would blur the input and close the list before the click lands.
    onMouseDown: (e: MouseEvent) => e.preventDefault(),
    onMouseEnter: () => setActive(i),
    onClick: () => choose(options[i]),
    className: `flex cursor-pointer items-center gap-3 px-4 py-2 ${i === active ? "bg-surface-2" : ""}`,
  });

  let index = 0;

  const suggestionRow = suggestion && (
    <li role="presentation" className="border-b border-line pb-1">
      <ul role="group" aria-label="Spelling suggestion">
        <li {...rowProps(index++)}>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <LuSparkles className="size-5" />
          </span>
          <span className="truncate text-sm text-ink-2">
            Did you mean <strong className="font-semibold text-accent">“{suggestion}”</strong>?
          </span>
        </li>
      </ul>
    </li>
  );

  const section =(title: string, rows: ReactNode[]) =>
    rows.length > 0 && (
      <li role="presentation">
        <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wider text-ink-3 uppercase">{title}</p>
        <ul role="group" aria-label={title}>
          {rows}
        </ul>
      </li>
    );

  const itemRows = items.map((item) => {
    const i = index++;
    return (
      <li key={item.id} {...rowProps(i)}>
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2 text-ink-3">
          {item.image ? (
            <img src={item.image} alt="" className="size-full object-cover" />
          ) : (
            <PiCoatHanger className="size-5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink-2">
            <Highlight text={item.title} typed={text} />
          </span>
          <span className="block truncate text-xs text-ink-3">
            {item.listingType === WANTED_TYPE ? "Wanted" : item.price ? formatMoney(item.price) : ""}
            {item.city && ` · ${item.city}`}
          </span>
        </span>
      </li>
    );
  });

  const placeRows = places.map((place) => {
    const i = index++;
    return (
      <li key={`${place.kind}:${place.value}`} {...rowProps(i)}>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <LuMapPin className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink-2">
            {place.query !== place.value && <>{place.query.slice(0, -place.value.length)}in </>}
            <Highlight text={placeLabel(place)} typed={text} />
          </span>
          <span className="block truncate text-xs text-ink-3">
            {PLACE_KIND_LABEL[place.kind]}
            {place.count !== null && ` · ${place.count} ${place.count === 1 ? "item" : "items"}`}
          </span>
        </span>
      </li>
    );
  });

  const searchIndex = index;

  return (
    <form
      role="search"
      onSubmit={submit}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      className="relative order-3 flex h-12 flex-[1_1_100%] items-center rounded-full border-[1.5px] border-line bg-surface py-1 pr-1 pl-12 shadow-xs transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft sm:order-none sm:h-[52px] sm:flex-[0_1_680px]"
    >
      <LuSearch className="absolute left-[18px] size-5 text-ink-3" />
      <input
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search items, cities or postcodes…"
        aria-label="Search listings"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText("");
            setActive(-1);
          }}
          aria-label="Clear search text"
          className="mr-1 grid size-8 place-items-center rounded-full bg-surface-2 text-ink-2"
        >
          <LuX className="size-4" />
        </button>
      )}
      <button
        type="submit"
        className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98] sm:w-auto sm:px-[22px]"
      >
        <LuSearch className="size-[18px]" />
        <span className="hidden sm:inline">Search</span>
      </button>

      {expanded && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-line bg-surface pb-2 shadow-float"
        >
          {suggestionRow}
          {section("Items", itemRows)}
          {section("Locations", placeRows)}
          <li role="presentation" className="mt-1 border-t border-line pt-1">
            <ul role="group" aria-label="Search">
              <li {...rowProps(searchIndex)}>
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-2">
                  <LuSearch className="size-5" />
                </span>
                <span className="truncate text-sm text-ink-2">
                  Search for <strong className="font-semibold text-ink">“{q}”</strong>
                </span>
              </li>
            </ul>
          </li>
        </ul>
      )}
    </form>
  );
}

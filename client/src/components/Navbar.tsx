import { useEffect, useState, type SubmitEvent } from "react";
import { LuHeart, LuLoaderCircle, LuSearch, LuSparkles, LuX } from "react-icons/lu";
import { Link, NavLink, useLocation, useMatch, useNavigate, useSearchParams } from "react-router";
import { cancelAiSearch, runAiSearch, useAiSearchPending } from "../lib/aiSearch";
import { useFavorites } from "../lib/favorites";
import { CATEGORIES, GENDERS, TYPES } from "../lib/format";
import { browseUrl, isBrowsePath, shouldUseAi } from "../lib/search";
import { countBadge } from "../lib/ui";
import Logo from "./Logo";

export default function Navbar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const category = useMatch("/category/:category")?.params.category;
  const favoriteCount = Object.keys(useFavorites()).length;

  const onBrowse = isBrowsePath(location.pathname);
  // Filters only carry over while browsing; from other pages start a fresh search.
  const currentSearch = onBrowse ? searchParams : new URLSearchParams();
  // After an AI search, show the shopper's own words rather than the AI's keywords.
  const keywords = onBrowse ? (searchParams.get("q") ?? searchParams.get("keywords") ?? "") : "";
  const aiPending = useAiSearchPending() !== null;

  // Moving to another page while an AI search runs cancels it, so a late
  // answer can't pull the shopper away from where they went.
  useEffect(() => cancelAiSearch(), [location.key]);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6 sm:py-0 sm:h-[76px]">
        <Logo />

        {/* Remount when the URL keywords change so the input mirrors the URL. */}
        <SearchForm
          key={keywords}
          initial={keywords}
          category={onBrowse ? category : undefined}
          current={currentSearch}
        />

        <NavLink
          to="/saved"
          className={({ isActive }) =>
            `relative ml-auto inline-flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium no-underline hover:bg-surface-2 sm:order-none ${
              isActive ? "bg-surface-2 text-warm" : "text-ink"
            }`
          }
          aria-label={`Saved items (${favoriteCount})`}
        >
          {({ isActive }) => (
            <>
              <LuHeart className={`size-5 ${isActive ? "fill-current" : ""}`} />
              <span className="hidden sm:inline">Saved</span>
              {favoriteCount > 0 && (
                <span className={`${countBadge} absolute top-0.5 right-0.5`}>{favoriteCount}</span>
              )}
            </>
          )}
        </NavLink>
      </div>

      <nav
        className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6"
        aria-label="Categories"
      >
        {CATEGORIES.map((c) => (
          <NavLink
            key={c.value}
            to={browseUrl(c.value, currentSearch, { category: c.value })}
            end
            className={({ isActive }) =>
              `relative whitespace-nowrap px-4 py-3 font-medium no-underline after:absolute after:inset-x-4 after:-bottom-px after:h-[2.5px] after:rounded-sm hover:text-ink ${
                isActive ? "font-semibold text-ink after:bg-ink" : "text-ink-2 after:bg-transparent"
              }`
            }
          >
            {c.label}
          </NavLink>
        ))}
      </nav>

      {onBrowse && category && <SubcategoryNav category={category} current={searchParams} />}

      {aiPending && (
        <div className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden bg-accent-soft" aria-hidden="true">
          <div className="h-full w-1/3 animate-progress rounded-full bg-accent" />
        </div>
      )}
    </header>
  );
}

const subLink = (active: boolean) =>
  `shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium no-underline transition ${
    active ? "bg-ink text-white" : "bg-surface-2 text-ink-2 hover:text-ink"
  }`;

function SubcategoryNav({ category, current }: { category: string; current: URLSearchParams }) {
  const gender = current.get("gender") ?? "";
  const type = current.get("type") ?? "";

  return (
    <nav
      className="border-t border-line"
      aria-label="Subcategories"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6">
        {category === "kids" && (
          <>
            {[{ value: "", label: "All kids" }, ...GENDERS].map((g) => (
              <Link
                key={g.value}
                to={browseUrl(category, current, { gender: g.value })}
                aria-current={gender === g.value ? "page" : undefined}
                className={subLink(gender === g.value)}
              >
                {g.label}
              </Link>
            ))}
            <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
          </>
        )}
        {TYPES.map((t) => (
          <Link
            key={t.value}
            to={browseUrl(category, current, { type: type === t.value ? "" : t.value })}
            aria-current={type === t.value ? "page" : undefined}
            className={subLink(type === t.value)}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function SearchForm({
  initial,
  category,
  current,
}: {
  initial: string;
  category?: string;
  current: URLSearchParams;
}) {
  const navigate = useNavigate();
  const [text, setText] = useState(initial);
  const pending = useAiSearchPending();
  const thinking = pending !== null;
  // While an AI search runs (possibly started from an example chip), show its words.
  const shown = pending ?? text;

  const useAi = shouldUseAi(shown);

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const query = text.trim();
    const keywordUrl = browseUrl(category, current, { keywords: query });
    if (!useAi) return navigate(keywordUrl);
    // AI unavailable, slow or confused: the keyword search is the fallback.
    runAiSearch(query, navigate, keywordUrl);
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      aria-busy={thinking}
      className="relative order-3 flex h-12 flex-[1_1_100%] items-center rounded-full border-[1.5px] border-line bg-surface py-1 pr-1 pl-12 shadow-xs transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft sm:order-none sm:h-[52px] sm:max-w-[680px] sm:flex-1"
    >
      {useAi ? (
        <LuSparkles className="absolute left-[18px] size-5 text-accent" aria-label="AI search" />
      ) : (
        <LuSearch className="absolute left-[18px] size-5 text-ink-3" />
      )}
      <span className="sr-only" aria-live="polite">
        {thinking ? "Searching with AI…" : ""}
      </span>
      <input
        type="search"
        value={shown}
        onChange={(e) => setText(e.target.value)}
        readOnly={thinking}
        placeholder="Search, or describe what you need…"
        aria-label="Search listings"
        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
      />
      {shown && (
        <button
          type="button"
          onClick={() => (thinking ? cancelAiSearch() : setText(""))}
          aria-label={thinking ? "Cancel AI search" : "Clear search text"}
          title={thinking ? "Cancel" : undefined}
          className="mr-1 grid size-8 place-items-center rounded-full bg-surface-2 text-ink-2"
        >
          <LuX className="size-4" />
        </button>
      )}
      <button
        type="submit"
        disabled={thinking}
        className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-wait disabled:opacity-90 sm:w-auto sm:px-[22px]"
      >
        {thinking ? (
          <LuLoaderCircle className="size-[18px] animate-spin" />
        ) : (
          <LuSearch className="size-[18px]" />
        )}
        <span className="hidden sm:inline">{thinking ? "Thinking…" : "Search"}</span>
      </button>
    </form>
  );
}

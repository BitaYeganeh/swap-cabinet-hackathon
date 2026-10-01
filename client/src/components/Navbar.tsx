import { useState, type SubmitEvent } from "react";
import { LuHeart, LuSearch, LuX } from "react-icons/lu";
import { NavLink, useLocation, useMatch, useNavigate, useSearchParams } from "react-router";
import { useFavorites } from "../lib/favorites";
import { CATEGORIES } from "../lib/format";
import { browseUrl, isBrowsePath } from "../lib/search";
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
  const keywords = onBrowse ? (searchParams.get("keywords") ?? "") : "";

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
    </header>
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

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    navigate(browseUrl(category, current, { keywords: text.trim() }));
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className="relative order-3 flex h-12 flex-[1_1_100%] items-center rounded-full border-[1.5px] border-line bg-surface py-1 pr-1 pl-12 shadow-xs transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft sm:order-none sm:h-[52px] sm:max-w-[680px] sm:flex-1"
    >
      <LuSearch className="absolute left-[18px] size-5 text-ink-3" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search for sneakers, jeans, bundles…"
        aria-label="Search listings"
        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
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
    </form>
  );
}

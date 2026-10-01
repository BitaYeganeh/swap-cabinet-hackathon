import { LuHeart } from "react-icons/lu";
import { Link, NavLink, useLocation, useMatch, useSearchParams } from "react-router";
import { useFavorites } from "../lib/favorites";
import { CATEGORIES, GENDERS, TYPES } from "../lib/format";
import { browseUrl, isBrowsePath } from "../lib/search";
import { countBadge } from "../lib/ui";
import Logo from "./Logo";
import SearchBar from "./SearchBar";

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
        <SearchBar
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

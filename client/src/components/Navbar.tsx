import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useSearchParams } from "react-router";
import { CATEGORIES, GENDERS, TYPES, categoryLabel } from "../lib/format";
import { cancelAiSearch, useAiSearchPending } from "../lib/aiSearch";
import { browseUrl, readSearch } from "../lib/search";
import CategoryMenu from "./CategoryMenu";
import Logo from "./Logo";
import SearchBar from "./SearchBar";

export default function Navbar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { category, keywords = "" } = readSearch(searchParams);

  // After an AI search, show the shopper's own words rather than the AI's keywords.
  const shownSearch = searchParams.get("q") ?? keywords;
  const aiPending = useAiSearchPending() !== null;

  // Moving to another page while an AI search runs cancels it, so a late
  // answer can't pull the shopper away from where they went.
  useEffect(() => cancelAiSearch(), [location.key]);

  // Desktop flyout: hovering (or focusing) a category tab slides its menu in
  // from the left, just below the tab row. Touch screens use the tabs directly.
  const tabsRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [menu, setMenu] = useState<{ category: string; top: number; key: string } | null>(null);
  // A menu belongs to the page it was opened on, so navigating closes it.
  const open = menu?.key === location.key ? menu : null;

  const schedule = (next: string | null, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const top = tabsRef.current?.getBoundingClientRect().bottom ?? 0;
      setMenu(next ? { category: next, top, key: location.key } : null);
    }, delay);
  };
  const keepOpen = () => clearTimeout(timer.current);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6 sm:py-0 sm:h-[76px]">
        {/* Equal-width slots either side keep the search bar centred. */}
        <div className="sm:flex-1">
          <Logo />
        </div>

        {/* Remount when the URL keywords change so the input mirrors the URL. */}
        <SearchBar
          key={shownSearch}
          initial={shownSearch}
          category={category}
          current={searchParams}
        />

        <div className="hidden sm:block sm:flex-1" aria-hidden="true" />
      </div>

      <nav
        ref={tabsRef}
        className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6"
        aria-label="Categories"
        onPointerLeave={(e) => e.pointerType === "mouse" && schedule(null, 200)}
      >
        {CATEGORIES.filter((c) => c.value).map((c) => (
          <Link
            key={c.value}
            to={browseUrl(searchParams, { category: c.value })}
            aria-current={category === c.value ? "page" : undefined}
            aria-expanded={open?.category === c.value}
            onPointerEnter={(e) => e.pointerType === "mouse" && schedule(c.value, open ? 0 : 120)}
            onFocus={() => window.matchMedia("(min-width: 1024px)").matches && schedule(c.value, 0)}
            // While a menu is open the underline follows it, not the current category.
            className={`relative whitespace-nowrap px-4 py-3 font-medium no-underline after:absolute after:inset-x-4 after:-bottom-px after:h-[2.5px] after:rounded-sm hover:text-ink ${
              (open ? open.category === c.value : category === c.value)
                ? "font-semibold text-ink after:bg-ink"
                : "text-ink-2 after:bg-transparent"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {open &&
        createPortal(
          <div className="max-lg:hidden">
            {/* Dims the page; moving onto it closes the menu. */}
            <div
              style={{ top: open.top }}
              className="fixed inset-x-0 bottom-0 z-40 animate-fade-in bg-black/65"
              onPointerEnter={() => schedule(null, 0)}
            />
            <div
              style={{ top: open.top }}
              className="fixed bottom-0 left-0 z-50 w-[min(50vw,960px)] min-w-[640px] animate-slide-in overflow-y-auto bg-white"
              onPointerEnter={keepOpen}
              onPointerLeave={(e) => e.pointerType === "mouse" && schedule(null, 200)}
              role="dialog"
              aria-label={`${categoryLabel(open.category)} menu`}
            >
              <CategoryMenu key={open.category} category={open.category} />
            </div>
          </div>,
          document.body
        )}

      {category && <SubcategoryNav category={category} current={searchParams} />}

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
                to={browseUrl(current, { gender: g.value })}
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
            to={browseUrl(current, { type: type === t.value ? "" : t.value })}
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

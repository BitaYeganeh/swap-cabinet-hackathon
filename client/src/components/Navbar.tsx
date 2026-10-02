import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuUser } from "react-icons/lu";
import { Link, useLocation, useSearchParams } from "react-router";
import logo from "../assets/logo-swap-cabinet.png";
import { MARKETPLACE_URL } from "../lib/basket";
import { BRAND } from "../lib/ui";
import { CATEGORIES, GENDERS, TYPES, categoryLabel } from "../lib/format";
import { cancelAiSearch, useAiSearchPending } from "../lib/aiSearch";
import { browseUrl, readSearch } from "../lib/search";
import { BasketButton } from "./Basket";
import { SavedButton } from "./Saved";
import CategoryMenu from "./CategoryMenu";
import SearchBar from "./SearchBar";

const headerLink = "px-2 text-[15px] whitespace-nowrap text-ink no-underline transition hover:text-accent";

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
    <header className="sticky top-0 z-20 bg-bg">
      {/* Like the marketplace header: logo | search on the left, account links and icons on the right. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:h-[76px] sm:flex-nowrap sm:gap-x-6 sm:px-6 sm:py-0">
        <Link
          to="/"
          aria-label={`${BRAND} home`}
          className="min-w-0 shrink sm:h-full sm:shrink-0 sm:border-r sm:border-line sm:pr-6"
        >
          <span className="flex h-full items-center">
            {/* The logo PNG has a white background; multiply blends it into the header. */}
            <img
              src={logo}
              alt={BRAND}
              width={288}
              height={36}
              className="h-5 w-auto mix-blend-multiply sm:h-7 xl:h-9"
            />
          </span>
        </Link>

        {/* Remount when the URL keywords change so the input mirrors the URL. */}
        <SearchBar key={shownSearch} initial={shownSearch} category={category} current={searchParams} />

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2">
          <Link to="/sell" className={`${headerLink} max-xl:hidden`}>
            Post a new listing
          </Link>
          <a
            href={`${MARKETPLACE_URL}/inbox/orders`}
            target="_blank"
            rel="noreferrer"
            className={`${headerLink} max-xl:hidden`}
          >
            Inbox
          </a>
          <SavedButton />
          <BasketButton />
          <a
            href={`${MARKETPLACE_URL}/profile-settings`}
            target="_blank"
            rel="noreferrer"
            aria-label="Your account"
            className="ml-1 grid size-9 shrink-0 place-items-center rounded-full bg-[#4a5d6e] sm:size-11 text-white transition hover:bg-[#3d4e5d]"
          >
            <LuUser className="size-5" />
          </a>
        </div>
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
            className={`relative whitespace-nowrap px-4 py-3 text-[15px] font-medium tracking-wide uppercase no-underline after:absolute after:inset-x-4 after:-bottom-px after:h-[2.5px] after:rounded-sm hover:text-ink ${
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
          document.body,
        )}

      {/* Tops / Bottoms / … : on the home page too (across all categories) and on every results page. */}
      {location.pathname === "/" && <SubcategoryNav category={category} current={searchParams} />}

      {aiPending && (
        <div className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden bg-accent-soft" aria-hidden="true">
          <div className="h-full w-1/3 animate-progress rounded-full bg-accent" />
        </div>
      )}
    </header>
  );
}

const subLink = (active: boolean) =>
  `shrink-0 whitespace-nowrap py-1.5 text-sm tracking-wide uppercase underline-offset-[6px] transition ${
    active ? "font-medium text-ink underline decoration-[1.5px]" : "text-ink-2 no-underline hover:text-ink hover:underline"
  }`;

function SubcategoryNav({ category, current }: { category?: string; current: URLSearchParams }) {
  const gender = current.get("gender") ?? "";
  const type = current.get("type") ?? "";

  return (
    <nav aria-label="Subcategories">
      <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6">
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

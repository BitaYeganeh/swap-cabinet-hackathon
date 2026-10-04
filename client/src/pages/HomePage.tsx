import { useRef } from "react";
import { LuSearch, LuSlidersHorizontal, LuSparkles, LuX } from "react-icons/lu";
import { Link, useLoaderData, useLocation, useNavigate, useNavigation, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import FilterBar from "../components/FilterBar";
import Hero from "../components/Hero";
import NoExactMatch from "../components/NoExactMatch";
import { widenedText } from "../lib/widened";
import ListingCard, { ListingGrid } from "../components/ListingCard";
import ListingModal from "../components/ListingModal";
import Pagination from "../components/Pagination";
import type { SearchParams } from "../lib/api";
import { COLORS, CONDITIONS, SORTS, TYPES, categoryLabel, genderLabel, labelFor } from "../lib/format";
import { readPickReasons } from "../lib/aiPicks";
import { sizeFilterLabel, useSizeSystem } from "../lib/sizes";
import { browseUrl, isLanding, readSearch } from "../lib/search";
import { BRAND, btn } from "../lib/ui";
import { useHeaderHeight } from "../lib/useHeaderHeight";
import type { listingsLoader } from "../loaders";

const CATEGORY_HEADINGS: Record<string, string> = {
  women: "Women's pre-loved fashion",
  men: "Men's pre-loved fashion",
  kids: "Kids' pre-loved fashion",
  boys: "Boys' pre-loved fashion",
  girls: "Girls' pre-loved fashion",
};

export default function HomePage() {
  const { listings, pagination, suggestion, similarOnly, brands } = useLoaderData<typeof listingsLoader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const resultsRef = useRef<HTMLDivElement>(null);
  const sizeSystem = useSizeSystem();
  const headerHeight = useHeaderHeight();

  const params: SearchParams = readSearch(searchParams);
  const { category } = params;
  const aiQuery = searchParams.get("q");
  const aiSummary = searchParams.get("ai");
  const relaxed = searchParams.get("relaxed")?.split(",").filter(Boolean) ?? [];
  const picked = !!params.ids;
  const noPicks = searchParams.get("nopicks") === "1";
  const reasons = picked ? readPickReasons(aiQuery) : {};
  const loading = navigation.state === "loading" && navigation.location.pathname === "/";

  const update = (changes: Partial<SearchParams>) =>
    navigate(browseUrl(searchParams, changes), { preventScrollReset: true });

  const clearAll = () => navigate("/", { preventScrollReset: true });

  const goToPage = (page: number) => {
    update({ page });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };


  const pills = [
    params.keywords && { key: "keywords", label: `“${params.keywords}”` },
    category && { key: "category", label: categoryLabel(category) },
    params.gender && { key: "gender", label: genderLabel(params.gender) },
    params.type && { key: "type", label: labelFor(TYPES, params.type) },
    params.size && {
      key: "size",
      // Shoe labels already read "Shoe EU 38".
      label: `${params.size.startsWith("shoe-") ? "" : "Size "}${sizeFilterLabel(params.size, category, sizeSystem)}`,
    },
    params.condition && { key: "condition", label: labelFor(CONDITIONS, params.condition) },
    params.color && { key: "color", label: labelFor(COLORS, params.color) },
    params.brand && { key: "brand", label: params.brand },
    (params.minPrice || params.maxPrice) && {
      key: "price",
      label: `€${params.minPrice || "0"} – ${params.maxPrice ? `€${params.maxPrice}` : "any"}`,
    },
  ].filter(Boolean) as { key: string; label: string }[];

  const removePill = (key: string) =>
    update(key === "price" ? { minPrice: "", maxPrice: "" } : { [key]: "" });

  const sectionHeading = CATEGORY_HEADINGS[(category === "kids" && params.gender) || category || ""];
  const typeHeading = params.type && labelFor(TYPES, params.type);

  const heading = aiSummary
    ? aiSummary
    : params.keywords
    ? `Results for “${params.keywords}”`
    : sectionHeading
      ? typeHeading
        ? `${sectionHeading.replace(" fashion", "")} ${typeHeading.toLowerCase()}`
        : sectionHeading
      : "All items";

  // Item details popup, from a card click or a shared "?item=" link.
  const itemId = searchParams.get("item");
  const closeItem = () => {
    // Opened from this page: step back so the Back button doesn't reopen it.
    if (location.state?.openedItem) navigate(-1);
    else navigate(browseUrl(searchParams, { item: "" }), { replace: true, preventScrollReset: true });
  };
  const modal = itemId && (
    <ListingModal key={itemId} id={itemId} known={listings.find((l) => l.id === itemId)} onClose={closeItem} />
  );

  // Count, filters and sort — on results pages and, as an entry point, above the hero.
  const filterBar = (
    <FilterBar params={params} brands={brands} onChange={update} count={pagination.totalItems}>
      <label className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-line bg-white pr-1.5 pl-3.5 transition hover:border-transparent hover:shadow-[0_2px_10px_rgb(0_0_0/0.12)] text-sm text-ink-2">
        <LuSlidersHorizontal className="size-[18px] shrink-0 text-ink" aria-hidden="true" />
        <select
          value={params.sort ?? ""}
          onChange={(e) => update({ sort: e.target.value })}
          aria-label="Sort by"
          className="h-full cursor-pointer bg-transparent font-semibold text-ink outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </FilterBar>
  );

  if (isLanding(params) && !aiQuery) {
    return (
      <>
        <title>{`${BRAND} · Pre-loved fashion`}</title>
        {/* Pinned under the header so the filters stay in view while scrolling past the hero. */}
        <div style={{ top: headerHeight }} className="sticky z-30 bg-bg">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 [&>div]:mb-0">{filterBar}</div>
        </div>
        <Hero />
        {modal}
      </>
    );
  }

  return (
    <>
      <title>{`${heading} · ${BRAND}`}</title>
      {modal}

      <div
        ref={resultsRef}
        style={{ scrollMarginTop: headerHeight }}
        className="mx-auto max-w-7xl px-4 pb-16 sm:px-6"
      >
        <section className="min-w-0">
          {/* No visible title (the tabs and filter pills say what's shown); kept for screen readers and the tab title. */}
          <h2 className="sr-only">{heading}</h2>
          {/* Honest label when nothing matched the words and these are only close in meaning. */}
          {/* Not an exact match: a clear amber notice, above any AI note. */}
          {aiQuery && aiSummary && relaxed.length > 0 && (
            <div className="pt-4">
              <NoExactMatch query={aiQuery} exactTo={`/?keywords=${encodeURIComponent(aiQuery)}`}>
                {widenedText(relaxed)}
              </NoExactMatch>
            </div>
          )}
          {!(aiQuery && relaxed.length > 0) && similarOnly && params.keywords && (
            <div className="pt-4">
              <NoExactMatch query={aiQuery || params.keywords}>
                No item mentions these words, so here are items that are similar in meaning.
              </NoExactMatch>
            </div>
          )}

          {suggestion && (
            <div className="pt-4">
              <p className="text-sm text-ink-2">
                Did you mean{" "}
                <button type="button" className={btn.link} onClick={() => update({ keywords: suggestion })}>
                  “{suggestion}”
                </button>
                ?
              </p>
            </div>
          )}

          {aiQuery && aiSummary && (
            <AiBanner query={aiQuery} relaxed={relaxed} picked={picked} noPicks={noPicks} />
          )}

          {filterBar}

          {pills.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {pills.map((pill) => (
                <button
                  type="button"
                  key={pill.key}
                  onClick={() => removePill(pill.key)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent-soft py-1.5 pr-2.5 pl-3.5 text-sm font-medium text-accent hover:bg-[#d3e6dc]"
                >
                  <span className="truncate">{pill.label}</span>
                  <LuX className="size-3.5" />
                </button>
              ))}
              <button type="button" className={btn.link} onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {listings.length === 0 ? (
            <EmptyState
              icon={<LuSearch />}
              title="No items match your search"
              action={
                <button type="button" className={btn.primary} onClick={clearAll}>
                  Clear search
                </button>
              }
            >
              Try different keywords or remove some filters.
            </EmptyState>
          ) : (
            <ListingGrid dimmed={loading}>
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} reason={reasons[listing.id]} />
              ))}
            </ListingGrid>
          )}

          <Pagination pagination={pagination} onPage={goToPage} />
        </section>
      </div>
    </>
  );
}

function AiBanner({
  query,
  relaxed,
  picked,
  noPicks,
}: {
  query: string;
  relaxed: string[];
  picked: boolean;
  noPicks: boolean;
}) {
  return (
    <div className="mb-4 flex gap-3 rounded-2xl border border-accent/20 bg-accent-soft/60 px-4 py-3 text-sm">
      <LuSparkles className="mt-0.5 size-[18px] shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        {picked ? (
          <p className="text-ink">
            The AI picked these for <strong className="font-semibold break-words">“{query}”</strong>, best
            match first. Each item says why it fits.
          </p>
        ) : (
          <p className="text-ink">
            AI search for <strong className="font-semibold break-words">“{query}”</strong>. Adjust the
            filters below to refine it.
          </p>
        )}
        {noPicks && (
          <p className="mt-1 text-ink-2">
            Nothing in the shop is a clear fit yet, so these are the closest matches by keyword.
          </p>
        )}
        {/* When filters were widened, the amber notice above says so and links to the exact search. */}
        {relaxed.length === 0 && (
          <Link
            to={`/?keywords=${encodeURIComponent(query)}`}
            className="mt-1 inline-block font-semibold text-accent no-underline hover:underline"
          >
            Search for the exact words instead
          </Link>
        )}
      </div>
    </div>
  );
}

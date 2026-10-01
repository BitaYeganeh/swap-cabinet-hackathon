import { useRef, useState } from "react";
import { LuSearch, LuSlidersHorizontal, LuX } from "react-icons/lu";
import { useLoaderData, useNavigate, useNavigation, useParams, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import Filters from "../components/Filters";
import Hero from "../components/Hero";
import ListingCard, { ListingGrid } from "../components/ListingCard";
import Pagination from "../components/Pagination";
import type { SearchParams } from "../lib/api";
import { COLORS, CONDITIONS, SORTS, TYPES, categoryLabel, genderLabel, labelFor } from "../lib/format";
import { sizeFilterLabel, useSizeSystem } from "../lib/sizes";
import { QUERY_KEYS, browseUrl, isBrowsePath, readSearch } from "../lib/search";
import { BRAND, btn, countBadge } from "../lib/ui";
import type { listingsLoader } from "../loaders";

const CATEGORY_HEADINGS: Record<string, string> = {
  women: "Women's pre-loved fashion",
  men: "Men's pre-loved fashion",
  kids: "Kids' pre-loved fashion",
  boys: "Boys' pre-loved fashion",
  girls: "Girls' pre-loved fashion",
};

export default function HomePage() {
  const { listings, pagination, suggestion, brands } = useLoaderData<typeof listingsLoader>();
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const sizeSystem = useSizeSystem();

  const params: SearchParams = { ...readSearch(searchParams), category };
  const loading = navigation.state === "loading" && isBrowsePath(navigation.location.pathname);

  const update = (changes: Partial<SearchParams>) =>
    navigate(browseUrl(category, searchParams, changes), { preventScrollReset: true });

  const clearAll = () => navigate("/", { preventScrollReset: true });

  const goToPage = (page: number) => {
    update({ page });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const hasFilters = !!category || QUERY_KEYS.some((key) => key !== "sort" && params[key]);
  const showHero = !hasFilters && (params.page ?? 1) === 1;

  const pills = [
    params.keywords && { key: "keywords", label: `“${params.keywords}”` },
    category && { key: "category", label: categoryLabel(category) },
    params.gender && { key: "gender", label: genderLabel(params.gender) },
    params.type && { key: "type", label: labelFor(TYPES, params.type) },
    params.size && { key: "size", label: `Size ${sizeFilterLabel(params.size, category, sizeSystem)}` },
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

  const heading = params.keywords
    ? `Results for “${params.keywords}”`
    : sectionHeading
      ? typeHeading
        ? `${sectionHeading.replace(" fashion", "")} ${typeHeading.toLowerCase()}`
        : sectionHeading
      : "All items";

  return (
    <>
      <title>{`${heading} · ${BRAND}`}</title>

      {showHero && <Hero listings={listings} />}

      <div
        ref={resultsRef}
        className={`mx-auto grid max-w-7xl gap-6 px-4 pt-5 pb-16 sm:px-6 sm:pt-8 lg:grid-cols-[230px_1fr] lg:gap-10 ${
          category ? "scroll-mt-[220px] sm:scroll-mt-[180px]" : "scroll-mt-[170px] sm:scroll-mt-[130px]"
        }`}
      >
        {/* Sidebar: static on desktop, slide-in drawer below lg. */}
        <aside
          className={`self-start lg:sticky ${category ? "lg:top-[185px]" : "lg:top-[140px]"} lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-60 max-lg:w-[min(340px,88vw)] max-lg:overflow-y-auto max-lg:bg-bg max-lg:px-5 max-lg:pb-5 max-lg:transition-transform max-lg:duration-300 ${
            filtersOpen ? "max-lg:translate-x-0 max-lg:shadow-float" : "max-lg:-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between text-lg font-semibold lg:hidden">
            Filters
            <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="p-1.5">
              <LuX className="size-5" />
            </button>
          </div>
          <Filters params={params} brands={brands} onChange={update} onClear={clearAll} />
          <button type="button" className={`${btn.primary} mt-5 w-full lg:hidden`} onClick={() => setFiltersOpen(false)}>
            Show {pagination.totalItems} results
          </button>
        </aside>
        {filtersOpen && (
          <div className="fixed inset-0 z-55 bg-black/45 lg:hidden" onClick={() => setFiltersOpen(false)} />
        )}

        <section className="min-w-0">
          <div className="mb-5 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-2xl leading-tight font-medium tracking-tight sm:text-3xl">{heading}</h2>
              <p className="mt-1 text-sm text-ink-3">
                {pagination.totalItems} {pagination.totalItems === 1 ? "item" : "items"}
              </p>
              {suggestion && (
                <p className="mt-1 text-sm text-ink-2">
                  Did you mean{" "}
                  <button type="button" className={btn.link} onClick={() => update({ keywords: suggestion })}>
                    “{suggestion}”
                  </button>
                  ?
                </p>
              )}
            </div>

            <div className="flex gap-2.5">
              <button type="button" className={`${btn.ghost} flex-1 lg:hidden`} onClick={() => setFiltersOpen(true)}>
                <LuSlidersHorizontal className="size-[18px]" /> Filters
                {pills.length > 0 && <span className={countBadge}>{pills.length}</span>}
              </button>
              <label className="flex h-11 flex-1 items-center gap-2 rounded-full border border-line bg-surface pr-1.5 pl-4 text-sm text-ink-2 sm:flex-none">
                <span className="whitespace-nowrap max-sm:hidden">Sort by</span>
                <select
                  value={params.sort ?? ""}
                  onChange={(e) => update({ sort: e.target.value })}
                  className="h-full w-full cursor-pointer bg-transparent font-semibold text-ink outline-none sm:w-auto"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {pills.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {pills.map((pill) => (
                <button
                  type="button"
                  key={pill.key}
                  onClick={() => removePill(pill.key)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1.5 pr-2.5 pl-3.5 text-sm font-medium text-accent hover:bg-[#d3e6dc]"
                >
                  {pill.label}
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
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </ListingGrid>
          )}

          <Pagination pagination={pagination} onPage={goToPage} />
        </section>
      </div>
    </>
  );
}

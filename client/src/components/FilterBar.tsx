import { useEffect, useRef, useState, type ReactNode } from "react";
import { LuCheck, LuSearch } from "react-icons/lu";
import { getFacets, type Brand, type Facets, type SearchParams } from "../lib/api";
import { COLORS, CONDITIONS, labelFor } from "../lib/format";
import {
  ADULT_SHOE_SIZES,
  KIDS_AGES,
  KIDS_SHOE_SIZES,
  LETTER_SIZES,
  SIZE_SYSTEMS,
  formatSize,
  setSizeSystem,
  sizeFilterLabel,
  sizeInfo,
  useSizeSystem,
  type SizeSystem,
} from "../lib/sizes";
import { btn } from "../lib/ui";
import { useHeaderHeight } from "../lib/useHeaderHeight";

type Props = {
  params: SearchParams;
  brands: Brand[];
  onChange: (changes: Partial<SearchParams>) => void;
  // Rendered at the right end of the bar (the sort control).
  children?: ReactNode;
  /** Matching items, shown at the start of the bar (as H&M does). */
  count?: number;
};

type FilterKey = "size" | "brand" | "price" | "condition" | "color";

const PANEL_WIDTH = 360;
const PANEL_GUTTER = 24; // matches the bar's sm:px-6
const BRANDS_SHOWN = 20;

// Option counts for the open dropdown, refetched when the search changes.
function useFacets(params: SearchParams, enabled: boolean) {
  const [result, setResult] = useState<{ key: string; facets: Facets } | null>(null);
  // Paging and the item popup don't change the counts.
  const key = JSON.stringify({ ...params, item: undefined, page: undefined });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    getFacets(JSON.parse(key), controller.signal)
      .then((facets) => setResult({ key, facets }))
      .catch(() => {});
    return () => controller.abort();
  }, [key, enabled]);

  return result?.key === key ? result.facets : null;
}

// One H&M-style option row: square checkbox, name, [count], optional colour dot.
// Options with nothing to show are greyed out (unless already picked).
function OptionRow({
  label,
  count,
  active,
  swatch,
  onClick,
}: {
  label: string;
  count: number | undefined;
  active: boolean;
  swatch?: string;
  onClick: () => void;
}) {
  const empty = count === 0 && !active;
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={active}
        disabled={empty}
        onClick={onClick}
        className="flex w-full items-center gap-3 py-2 text-left text-[15px] transition enabled:hover:text-accent disabled:cursor-default disabled:text-ink-3/60"
      >
        <span
          className={`grid size-5 shrink-0 place-items-center border ${
            active ? "border-ink bg-ink text-white" : empty ? "border-line" : "border-ink-3"
          }`}
        >
          {active && <LuCheck className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && <span className="shrink-0 text-sm text-ink-3 tabular-nums">[ {count} ]</span>}
        {swatch && (
          <span
            style={{ background: swatch }}
            className={`size-5 shrink-0 rounded-full border border-black/20 ${empty ? "opacity-40" : ""}`}
          />
        )}
      </button>
    </li>
  );
}

const optionList = "-my-1 max-h-[min(60vh,420px)] overflow-y-auto pr-1";

// Size filtering only applies to clothing and shoes.
const hasSizes = (type?: string) => !type || ["tops", "bottoms", "shoes"].includes(type);

export default function FilterBar({ params, brands, onChange, children, count }: Props) {
  const system = useSizeSystem();
  const headerHeight = useHeaderHeight();
  const barRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<{ key: FilterKey; left: number | null } | null>(null);

  const close = () => setOpen(null);
  const facets = useFacets(params, open !== null && ["color", "condition", "brand", "price"].includes(open.key));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (key: FilterKey, chip: HTMLElement) => {
    if (open?.key === key) return close();
    // From sm up, line the panel up under its chip, kept inside the bar's padding.
    // On phones it spans the bar instead.
    const bar = barRef.current!.getBoundingClientRect();
    const left = Math.max(
      PANEL_GUTTER,
      Math.min(chip.getBoundingClientRect().left - bar.left, bar.width - PANEL_GUTTER - PANEL_WIDTH),
    );
    setOpen({ key, left: window.innerWidth < 640 ? null : left });
  };

  // Picking an option applies it and closes the panel.
  const apply = (changes: Partial<SearchParams>) => {
    onChange(changes);
    close();
  };

  const filters: { key: FilterKey; label: string; value?: string; hidden?: boolean }[] = [
    {
      key: "size",
      label: "Size",
      value: params.size && sizeFilterLabel(params.size, params.category, system),
      hidden: !hasSizes(params.type),
    },
    { key: "brand", label: "Brand", value: params.brand, hidden: brands.length === 0 },
    {
      key: "price",
      label: "Price",
      value:
        params.minPrice || params.maxPrice
          ? `€${params.minPrice || "0"} – ${params.maxPrice ? `€${params.maxPrice}` : "any"}`
          : undefined,
    },
    { key: "condition", label: "Condition", value: params.condition && labelFor(CONDITIONS, params.condition) },
    { key: "color", label: "Colour", value: params.color && labelFor(COLORS, params.color) },
  ];

  const current = filters.find((f) => f.key === open?.key);
  const clearChanges: Record<FilterKey, Partial<SearchParams>> = {
    size: { size: "" },
    brand: { brand: "" },
    price: { minPrice: "", maxPrice: "" },
    condition: { condition: "" },
    color: { color: "" },
  };

  return (
    <div
      ref={barRef}
      style={{ top: headerHeight }}
      // While a dropdown is open the bar rises above the header so its panel isn't covered.
      className={`sticky -mx-4 mb-4 bg-bg/95 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6 ${
        open ? "z-40" : "z-10"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {count !== undefined && (
          <p className="shrink-0 pr-1 text-sm whitespace-nowrap text-ink-3" aria-live="polite">
            {count} {count === 1 ? "item" : "items"}
          </p>
        )}
        <div
          // Vertical padding keeps the hover shadow from being clipped by the scroll container.
          className="-my-2 flex min-w-0 flex-1 gap-2.5 overflow-x-auto px-1 py-2 [scrollbar-width:none]"
          onScroll={close}
          role="toolbar"
          aria-label="Filters"
        >
          {filters
            .filter((f) => !f.hidden)
            .map((f) => (
              <button
                type="button"
                key={f.key}
                aria-expanded={open?.key === f.key}
                onClick={(e) => toggle(f.key, e.currentTarget)}
                // Square-ish white buttons that lift with a soft shadow on hover or while open.
                className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-5 text-sm font-medium whitespace-nowrap transition ${
                  f.value
                    ? "border-ink bg-ink text-white"
                    : open?.key === f.key
                      ? "border-transparent bg-white text-ink shadow-[0_2px_10px_rgb(0_0_0/0.12)]"
                      : "border-line bg-white text-ink-2 hover:border-transparent hover:text-ink hover:shadow-[0_2px_10px_rgb(0_0_0/0.12)]"
                }`}
              >
                {f.value ? (
                  <>
                    <span className="text-white/70">{f.label}:</span> {f.value}
                  </>
                ) : (
                  f.label
                )}
              </button>
            ))}
        </div>
        {children}
      </div>

      {open && current && (
        <div
          style={open.left === null ? undefined : { left: open.left, width: PANEL_WIDTH }}
          className={`absolute top-full mt-2 rounded-2xl border border-line bg-surface p-4 shadow-float ${
            open.left === null ? "inset-x-4" : ""
          }`}
          role="dialog"
          aria-label={`${current.label} filter`}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold tracking-wider text-ink-2 uppercase">{current.label}</h3>
            <div className="flex items-center gap-3">
              {current.key === "size" && <SizeSystemToggle value={system} />}
              {current.value && (
                <button type="button" className={btn.link} onClick={() => apply(clearChanges[current.key])}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {current.key === "size" && <SizeOptions params={params} system={system} onChange={apply} />}
          {current.key === "brand" && <BrandOptions params={params} brands={brands} counts={facets?.brand} onChange={apply} />}
          {current.key === "price" && (
            <PriceSlider
              key={facets ? "ready" : "loading"}
              range={facets?.price}
              loading={!facets}
              minPrice={params.minPrice ?? ""}
              maxPrice={params.maxPrice ?? ""}
              onApply={(minPrice, maxPrice) => apply({ minPrice, maxPrice })}
            />
          )}
          {current.key === "condition" && (
            <ul className={optionList}>
              {CONDITIONS.map((c) => {
                const active = params.condition === c.value;
                return (
                  <OptionRow
                    key={c.value}
                    label={c.label}
                    count={facets ? (facets.condition[c.value] ?? 0) : undefined}
                    active={active}
                    onClick={() => apply({ condition: active ? "" : c.value })}
                  />
                );
              })}
            </ul>
          )}
          {current.key === "color" && <ColorOptions params={params} counts={facets?.color} onChange={apply} />}
        </div>
      )}
    </div>
  );
}

type OptionProps = {
  params: SearchParams;
  onChange: (changes: Partial<SearchParams>) => void;
};

function BrandOptions({
  params,
  brands,
  counts,
  onChange,
}: OptionProps & { brands: Brand[]; counts?: Record<string, number> }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const countOf = (b: Brand) => (counts ? (counts[b.name.toLowerCase()] ?? 0) : undefined);
  const isActive = (b: Brand) => params.brand?.toLowerCase() === b.name.toLowerCase();

  // Only brands with items in this search (plus a picked one), most items first.
  // Brand lists are long, so unlike colours, brands with nothing are left out.
  const available = counts
    ? brands.filter((b) => (countOf(b) ?? 0) > 0 || isActive(b)).sort((a, b) => (countOf(b) ?? 0) - (countOf(a) ?? 0))
    : brands;
  const matches = q ? available.filter((b) => b.name.toLowerCase().includes(q)) : available.slice(0, BRANDS_SHOWN);

  return (
    <>
      {available.length > 8 && (
        <label className="mb-3 flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-accent">
          <LuSearch className="size-4 shrink-0 text-ink-3" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${available.length} brands`}
            aria-label="Search brands"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      )}
      <ul className={optionList}>
        {matches.map((b) => (
          <OptionRow
            key={b.name}
            label={b.name}
            count={countOf(b)}
            active={isActive(b)}
            onClick={() => onChange({ brand: isActive(b) ? "" : b.name })}
          />
        ))}
        {matches.length === 0 && (
          <p className="py-2 text-sm text-ink-3">
            {q ? `No brands match “${query}”.` : "None of the items in this search has a brand."}
          </p>
        )}
      </ul>
    </>
  );
}

function ColorOptions({ params, counts, onChange }: OptionProps & { counts?: Record<string, number> }) {
  return (
    <ul className={optionList}>
      {COLORS.map((c) => {
        const active = params.color === c.value;
        return (
          <OptionRow
            key={c.value}
            label={c.label === "Multi" ? "Multicolour" : c.label}
            count={counts ? (counts[c.value] ?? 0) : undefined}
            active={active}
            swatch={c.swatch}
            onClick={() => onChange({ color: active ? "" : c.value })}
          />
        );
      })}
    </ul>
  );
}

const sizeSelect =
  "h-10 w-full cursor-pointer rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-accent";

function SizeOptions({ params, system, onChange }: OptionProps & { system: SizeSystem }) {
  const { category, type, size = "" } = params;
  const kids = category === "kids";

  const showClothing = !type || type === "tops" || type === "bottoms";
  const showShoes = !type || type === "shoes";

  const shoeSizes = kids ? KIDS_SHOE_SIZES : ADULT_SHOE_SIZES;
  const pick = (value: string) => onChange({ size: size === value ? "" : value });

  return (
    <>
      {showClothing && !kids && (
        <div className="grid grid-cols-3 gap-2">
          {LETTER_SIZES.map((letter) => {
            const active = size === letter;
            const converted = sizeInfo(letter, category)?.conversion?.[system];
            return (
              <button
                type="button"
                key={letter}
                aria-pressed={active}
                onClick={() => pick(letter)}
                className={`flex flex-col items-center rounded-lg border py-1.5 transition ${
                  active ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink-3"
                }`}
              >
                <span className="text-sm font-semibold">{letter.toUpperCase()}</span>
                {converted && (
                  <span className={`text-[11px] ${active ? "text-white/75" : "text-ink-3"}`}>
                    {system} {converted}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {showClothing && kids && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Clothing (age)</span>
          <select
            value={size.startsWith("kids-") ? size : ""}
            onChange={(e) => onChange({ size: e.target.value })}
            className={sizeSelect}
          >
            <option value="">Any age</option>
            {KIDS_AGES.map((age) => (
              <option key={age.value} value={`kids-${age.value}`}>
                {age.label} · {formatSize(age.value, "kids", system)}
              </option>
            ))}
          </select>
        </label>
      )}

      {showShoes && (
        <label className={`block ${showClothing ? "mt-3" : ""}`}>
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Shoes</span>
          <select
            value={size.startsWith("shoe-") ? size : ""}
            onChange={(e) => onChange({ size: e.target.value })}
            className={sizeSelect}
          >
            <option value="">Any shoe size</option>
            {shoeSizes.map((eu) => (
              <option key={eu} value={`shoe-${eu}`}>
                {/* Adult shoe conversions differ for men and women, so stay EU-only on "All". */}
                {system === "EU" || !category ? `EU ${eu}` : `${formatSize(eu, category, system)} (EU ${eu})`}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

function SizeSystemToggle({ value }: { value: SizeSystem }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-0.5 text-xs" role="group" aria-label="Size system">
      {SIZE_SYSTEMS.map((s) => (
        <button
          type="button"
          key={s}
          aria-pressed={value === s}
          onClick={() => setSizeSystem(s)}
          className={`rounded-full px-2.5 py-1 font-semibold transition ${
            value === s ? "bg-ink text-white" : "text-ink-2 hover:text-ink"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

const PRICE_STEP = 1; // euros

// Two-handle price slider over the search's own price range (whole euros).
// Dragging only moves the handles; "Show items" applies the range.
function PriceSlider({
  range,
  loading,
  minPrice,
  maxPrice,
  onApply,
}: {
  range: { min: number; max: number } | null | undefined;
  loading: boolean;
  minPrice: string;
  maxPrice: string;
  onApply: (min: string, max: string) => void;
}) {
  const floor = range ? Math.floor(range.min / 100) : 0;
  const ceil = range ? Math.max(floor + 1, Math.ceil(range.max / 100)) : 100;
  const clamp = (n: number) => Math.min(ceil, Math.max(floor, n));

  const [low, setLow] = useState(() => clamp(minPrice ? Number(minPrice) : floor));
  const [high, setHigh] = useState(() => clamp(maxPrice ? Number(maxPrice) : ceil));

  if (loading) return <div className="shimmer h-24 rounded-lg" />;
  if (!range) return <p className="text-sm text-ink-3">No priced items in this search.</p>;

  const pct = (n: number) => ((n - floor) / (ceil - floor)) * 100;
  const full = low === floor && high === ceil;
  // Leaving a handle at the end of the range means "no limit" on that side.
  const apply = () => onApply(low === floor ? "" : String(low), high === ceil ? "" : String(high));

  const thumb =
    "pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent outline-none " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab " +
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 " +
    "[&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-card " +
    "active:[&::-webkit-slider-thumb]:cursor-grabbing focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-accent-soft " +
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab " +
    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent " +
    "[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-card [&::-moz-range-track]:bg-transparent";

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between text-[15px] font-semibold tabular-nums">
        <span>€{low}</span>
        <span className="text-ink-3">–</span>
        <span>
          €{high}
          {high === ceil && "+"}
        </span>
      </div>

      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }}
        />
        <input
          type="range"
          min={floor}
          max={ceil}
          step={PRICE_STEP}
          value={low}
          onChange={(e) => setLow(Math.min(Number(e.target.value), high - PRICE_STEP))}
          aria-label="Minimum price"
          aria-valuetext={`€${low}`}
          // Keep the low handle reachable when both sit at the top end.
          className={`${thumb} ${low > ceil - (ceil - floor) / 10 ? "z-20" : "z-10"}`}
        />
        <input
          type="range"
          min={floor}
          max={ceil}
          step={PRICE_STEP}
          value={high}
          onChange={(e) => setHigh(Math.max(Number(e.target.value), low + PRICE_STEP))}
          aria-label="Maximum price"
          aria-valuetext={`€${high}`}
          className={`${thumb} z-10`}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-ink-3">
        <span>€{floor}</span>
        <span>€{ceil}</span>
      </div>

      <div className="mt-5 flex items-center gap-3">
        {!full && (
          <button
            type="button"
            onClick={() => {
              setLow(floor);
              setHigh(ceil);
            }}
            className={btn.link}
          >
            Reset
          </button>
        )}
        <button type="button" onClick={apply} className={`${btn.primary} ml-auto h-10`}>
          Show items
        </button>
      </div>
    </div>
  );
}

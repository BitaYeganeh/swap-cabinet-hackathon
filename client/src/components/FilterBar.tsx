import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { LuChevronDown, LuSearch } from "react-icons/lu";
import type { Brand, SearchParams } from "../lib/api";
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
};

type FilterKey = "size" | "brand" | "price" | "condition" | "color";

const PANEL_WIDTH = 360;
const PANEL_GUTTER = 24; // matches the bar's sm:px-6
const BRANDS_SHOWN = 20;

const chipButton = (active: boolean) =>
  `rounded-full border px-3.5 py-[7px] text-sm transition ${
    active ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink-3"
  }`;

// Size filtering only applies to clothing and shoes.
const hasSizes = (type?: string) => !type || ["tops", "bottoms", "shoes"].includes(type);

export default function FilterBar({ params, brands, onChange, children }: Props) {
  const system = useSizeSystem();
  const headerHeight = useHeaderHeight();
  const barRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<{ key: FilterKey; left: number | null } | null>(null);

  const close = () => setOpen(null);

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
      className="sticky z-10 -mx-4 mb-5 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none]"
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
                className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition ${
                  f.value
                    ? "border-ink bg-ink text-white"
                    : open?.key === f.key
                      ? "border-ink bg-surface"
                      : "border-line bg-surface hover:border-ink-3"
                }`}
              >
                {f.value ? (
                  <>
                    <span className="text-white/70">{f.label}:</span> {f.value}
                  </>
                ) : (
                  f.label
                )}
                <LuChevronDown
                  className={`size-4 transition-transform ${open?.key === f.key ? "rotate-180" : ""}`}
                />
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
          {current.key === "brand" && <BrandOptions params={params} brands={brands} onChange={apply} />}
          {current.key === "price" && (
            <PriceFilter
              minPrice={params.minPrice ?? ""}
              maxPrice={params.maxPrice ?? ""}
              onApply={(minPrice, maxPrice) => apply({ minPrice, maxPrice })}
            />
          )}
          {current.key === "condition" && (
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const active = params.condition === c.value;
                return (
                  <button
                    type="button"
                    key={c.value}
                    aria-pressed={active}
                    onClick={() => apply({ condition: active ? "" : c.value })}
                    className={chipButton(active)}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}
          {current.key === "color" && <ColorOptions params={params} onChange={apply} />}
        </div>
      )}
    </div>
  );
}

type OptionProps = {
  params: SearchParams;
  onChange: (changes: Partial<SearchParams>) => void;
};

function BrandOptions({ params, brands, onChange }: OptionProps & { brands: Brand[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands.slice(0, BRANDS_SHOWN);

  return (
    <>
      {brands.length > 8 && (
        <label className="mb-3 flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-accent">
          <LuSearch className="size-4 shrink-0 text-ink-3" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${brands.length} brands`}
            aria-label="Search brands"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      )}
      <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
        {matches.map((b) => {
          const active = params.brand?.toLowerCase() === b.name.toLowerCase();
          return (
            <button
              type="button"
              key={b.name}
              aria-pressed={active}
              onClick={() => onChange({ brand: active ? "" : b.name })}
              className={chipButton(active)}
            >
              {b.name}
              <span className={`ml-1.5 ${active ? "text-white/70" : "text-ink-3"}`}>{b.count}</span>
            </button>
          );
        })}
        {matches.length === 0 && <p className="text-sm text-ink-3">No brands match “{query}”.</p>}
      </div>
    </>
  );
}

function ColorOptions({ params, onChange }: OptionProps) {
  return (
    <div className="grid grid-cols-4 gap-x-1 gap-y-2.5">
      {COLORS.map((c) => {
        const active = params.color === c.value;
        return (
          <button
            type="button"
            key={c.value}
            title={c.label}
            aria-pressed={active}
            onClick={() => onChange({ color: active ? "" : c.value })}
            className={`group flex flex-col items-center gap-1.5 py-1 text-xs ${
              active ? "font-semibold text-ink" : "text-ink-2"
            }`}
          >
            <span
              style={{ background: c.swatch }}
              className={`size-[30px] rounded-full border border-black/15 ring-offset-[3px] ring-offset-surface transition ${
                active ? "ring-2 ring-ink" : "group-hover:ring-1 group-hover:ring-line"
              }`}
            />
            {c.label}
          </button>
        );
      })}
    </div>
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

const priceInput =
  "h-10 w-full min-w-0 rounded-lg border border-line bg-surface px-3 outline-none focus:border-accent";

function PriceFilter({
  minPrice,
  maxPrice,
  onApply,
}: {
  minPrice: string;
  maxPrice: string;
  onApply: (min: string, max: string) => void;
}) {
  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    onApply(min, max);
  };

  return (
    <form className="flex items-center gap-2" onSubmit={submit}>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder="Min"
        autoFocus
        value={min}
        onChange={(e) => setMin(e.target.value)}
        aria-label="Minimum price"
        className={priceInput}
      />
      <span className="text-ink-3">–</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder="Max"
        value={max}
        onChange={(e) => setMax(e.target.value)}
        aria-label="Maximum price"
        className={priceInput}
      />
      <button type="submit" className={`${btn.dark} shrink-0`}>
        Go
      </button>
    </form>
  );
}

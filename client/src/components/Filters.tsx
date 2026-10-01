import { useState, type SubmitEvent } from "react";
import type { Brand, SearchParams } from "../lib/api";
import { CATEGORIES, COLORS, CONDITIONS, GENDERS, TYPES } from "../lib/format";
import {
  ADULT_SHOE_SIZES,
  KIDS_AGES,
  KIDS_SHOE_SIZES,
  LETTER_SIZES,
  SIZE_SYSTEMS,
  formatSize,
  setSizeSystem,
  sizeInfo,
  useSizeSystem,
  type SizeSystem,
} from "../lib/sizes";
import { btn } from "../lib/ui";

type Props = {
  params: SearchParams;
  brands: Brand[];
  onChange: (changes: Partial<SearchParams>) => void;
  onClear: () => void;
};

const groupTitle = "mb-3 text-[13px] font-semibold tracking-wider text-ink-2 uppercase";

const chipButton = (active: boolean) =>
  `rounded-full border px-3.5 py-[7px] text-sm transition ${
    active ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink-3"
  }`;

export default function Filters({ params, brands, onChange, onClear }: Props) {
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-line pb-3.5">
        <h2 className="text-lg font-semibold max-lg:hidden">Filters</h2>
        <button type="button" className={`${btn.link} lg:ml-0 max-lg:ml-auto`} onClick={onClear}>
          Clear all
        </button>
      </div>

      <section className="border-b border-line py-[18px]">
        <h3 className={groupTitle}>Category</h3>
        <div className="grid gap-2">
          {CATEGORIES.map((c) => (
            <label key={c.value} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="radio"
                name="category"
                checked={(params.category || "") === c.value}
                onChange={() => onChange({ category: c.value })}
                className="size-[18px] accent-accent"
              />
              <span>{c.value ? c.label : "All categories"}</span>
            </label>
          ))}
        </div>
      </section>

      {params.category && (
        <section className="border-b border-line py-[18px]">
          <h3 className={groupTitle}>Subcategory</h3>

          {params.category === "kids" && (
            <div className="mb-3 grid grid-cols-3 rounded-full border border-line bg-surface p-1 text-sm">
              {[{ value: "", label: "All kids" }, ...GENDERS].map((g) => {
                const active = (params.gender || "") === g.value;
                return (
                  <button
                    type="button"
                    key={g.value}
                    aria-pressed={active}
                    onClick={() => onChange({ gender: g.value })}
                    className={`rounded-full py-1.5 font-medium transition ${
                      active ? "bg-ink text-white" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => {
              const active = params.type === t.value;
              return (
                <button
                  type="button"
                  key={t.value}
                  aria-pressed={active}
                  onClick={() => onChange({ type: active ? "" : t.value })}
                  className={chipButton(active)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <SizeFilter params={params} onChange={onChange} />

      <section className="border-b border-line py-[18px]">
        <h3 className={groupTitle}>Condition</h3>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => {
            const active = params.condition === c.value;
            return (
              <button
                type="button"
                key={c.value}
                aria-pressed={active}
                onClick={() => onChange({ condition: active ? "" : c.value })}
                className={chipButton(active)}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-b border-line py-[18px]">
        <h3 className={groupTitle}>Price (€)</h3>
        <PriceFilter
          key={`${params.minPrice ?? ""}-${params.maxPrice ?? ""}`}
          minPrice={params.minPrice ?? ""}
          maxPrice={params.maxPrice ?? ""}
          onApply={(minPrice, maxPrice) => onChange({ minPrice, maxPrice })}
        />
      </section>

      <section className="border-b border-line py-[18px]">
        <h3 className={groupTitle}>Colour</h3>
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
                  className={`size-[30px] rounded-full border border-black/15 ring-offset-[3px] ring-offset-bg transition ${
                    active ? "ring-2 ring-ink" : "group-hover:ring-1 group-hover:ring-line"
                  }`}
                />
                {c.label}
              </button>
            );
          })}
        </div>
      </section>

      {brands.length > 0 && (
        <section className="border-b border-line py-[18px]">
          <h3 className={groupTitle}>Brand</h3>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => {
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
          </div>
        </section>
      )}
    </div>
  );
}

const sizeSelect =
  "h-10 w-full cursor-pointer rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-accent";

function SizeFilter({ params, onChange }: Pick<Props, "params" | "onChange">) {
  const system = useSizeSystem();
  const { category, type, size = "" } = params;
  const kids = category === "kids";

  const showClothing = !type || type === "tops" || type === "bottoms";
  const showShoes = !type || type === "shoes";
  if (!showClothing && !showShoes) return null;

  const shoeSizes = kids ? KIDS_SHOE_SIZES : ADULT_SHOE_SIZES;
  const pick = (value: string) => onChange({ size: size === value ? "" : value });

  return (
    <section className="border-b border-line py-[18px]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className={`${groupTitle} mb-0`}>Size</h3>
        <SizeSystemToggle value={system} />
      </div>

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
    </section>
  );
}

export function SizeSystemToggle({ value }: { value: SizeSystem }) {
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

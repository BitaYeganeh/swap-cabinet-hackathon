import { useState, type SubmitEvent } from "react";
import type { SearchParams } from "../lib/api";
import { CATEGORIES, COLORS, CONDITIONS } from "../lib/format";
import { btn } from "../lib/ui";

type Props = {
  params: SearchParams;
  onChange: (changes: Partial<SearchParams>) => void;
  onClear: () => void;
};

const groupTitle = "mb-3 text-[13px] font-semibold tracking-wider text-ink-2 uppercase";

export default function Filters({ params, onChange, onClear }: Props) {
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
                className={`rounded-full border px-3.5 py-[7px] text-sm transition ${
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface hover:border-ink-3"
                }`}
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

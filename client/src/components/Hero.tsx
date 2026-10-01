import { LuChevronRight, LuShieldCheck, LuTruck } from "react-icons/lu";
import { Link } from "react-router";
import type { Listing } from "../lib/api";
import { CATEGORIES } from "../lib/format";

const tileColors: Record<string, string> = {
  women: "bg-[#b7654a]",
  men: "bg-[#2f4f5f]",
  kids: "bg-[#c79a3a]",
};

export default function Hero({ listings }: { listings: Listing[] }) {
  return (
    <section className="pt-6 pb-4 sm:pt-10">
      <div className="mx-auto grid max-w-7xl items-center gap-7 px-4 sm:px-6 lg:grid-cols-[1fr_1.25fr] lg:gap-10">
        <div className="animate-fade-up">
          <p className="mb-3.5 text-[13px] font-semibold tracking-[0.12em] text-warm uppercase">
            Second-hand marketplace
          </p>
          <h1 className="font-display text-[clamp(32px,5vw,60px)] leading-[1.05] font-medium tracking-tight">
            Pre-loved style,
            <br />
            <em className="text-accent">fresh finds</em> every day.
          </h1>
          <p className="mt-4 max-w-[440px] text-base text-ink-2 sm:mt-[18px] sm:text-[17px]">
            Shop quality second-hand clothing, shoes and bundles from people in your area.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm sm:mt-7 font-medium text-ink-2">
            <span className="inline-flex items-center gap-2">
              <LuTruck className="size-[18px] text-accent" /> Shipping or pickup
            </span>
            <span className="inline-flex items-center gap-2">
              <LuShieldCheck className="size-[18px] text-accent" /> Condition checked
            </span>
          </div>
        </div>

        <div className="grid h-60 grid-cols-[1.2fr_1fr] grid-rows-2 gap-2.5 sm:h-[300px] sm:gap-3.5 lg:h-[380px]">
          {CATEGORIES.filter((c) => c.value).map((c, i) => {
            const photo = listings.find((l) => l.category === c.value && l.images[0])?.images[0].url2x;
            return (
              <Link
                key={c.value}
                to={`/category/${c.value}`}
                style={photo ? { backgroundImage: `url("${photo}")` } : undefined}
                className={`relative isolate flex flex-col items-start justify-end gap-1 overflow-hidden rounded-[22px] bg-cover bg-center p-4 text-white no-underline transition duration-300 before:absolute before:inset-0 before:-z-10 before:bg-linear-to-b before:from-transparent before:from-35% before:to-black/55 hover:-translate-y-[3px] sm:p-[22px] ${
                  tileColors[c.value]
                } ${i === 0 ? "row-span-2" : ""}`}
              >
                <span className="font-display text-[22px] leading-tight font-medium sm:text-3xl">{c.label}</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold opacity-90">
                  Shop now <LuChevronRight className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

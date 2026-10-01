import { LuShieldCheck, LuTruck } from "react-icons/lu";
import { Link } from "react-router";
import heroPhoto from "../assets/hero-rack.jpg";
import { CATEGORIES } from "../lib/format";
import { browseUrl } from "../lib/search";
import { useHeaderHeight } from "../lib/useHeaderHeight";
import { btn } from "../lib/ui";

// Height of the green announcement strip above the header.
const BANNER_HEIGHT = 33;

// Full-width black-and-white photo filling the screen below the header; a white
// fade gives the copy a clean "white side" (from the left on desktop, the top on phones).
export default function Hero() {
  const headerHeight = useHeaderHeight();

  return (
    <section
      style={{ minHeight: `calc(100svh - ${headerHeight + BANNER_HEIGHT}px)` }}
      className="relative isolate flex flex-col overflow-hidden bg-white"
    >
      <img
        src={heroPhoto}
        alt="Second-hand shirts and jackets hanging on a clothing rail"
        width={2400}
        height={1600}
        fetchPriority="high"
        className="absolute inset-0 -z-20 size-full object-cover object-[70%_center] grayscale"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-white from-45% via-white/80 via-70% to-white/10 lg:bg-linear-to-r lg:from-white lg:from-30% lg:via-white/85 lg:via-50% lg:to-transparent lg:to-75%" />

      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4 pt-10 pb-48 sm:px-6 sm:pb-64 lg:items-center lg:py-12">
        <div className="max-w-[520px] animate-fade-up">
          <p className="mb-4 text-[13px] font-semibold tracking-[0.18em] text-ink-2 uppercase">
            Second-hand marketplace
          </p>
          <h1 className="font-display text-[clamp(40px,6.2vw,80px)] leading-[0.98] font-medium tracking-tight text-ink">
            Pre-loved style,
            <br />
            <em className="text-accent">fresh finds</em> every day.
          </h1>
          <p className="mt-5 max-w-[420px] text-base text-ink-2 sm:text-lg">
            Shop quality second-hand clothing, shoes and bundles from people in your area.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {CATEGORIES.filter((c) => c.value).map((c, i) => (
              <Link
                key={c.value}
                to={browseUrl(new URLSearchParams(), { category: c.value })}
                className={i === 0 ? `${btn.dark} h-11 px-6` : `${btn.ghost} px-6`}
              >
                Shop {c.label.toLowerCase()}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink-2">
            <span className="inline-flex items-center gap-2">
              <LuTruck className="size-[18px] text-accent" /> Shipping or pickup
            </span>
            <span className="inline-flex items-center gap-2">
              <LuShieldCheck className="size-[18px] text-accent" /> Condition checked
            </span>
          </div>
        </div>
      </div>

      <span className="absolute right-3 bottom-2 rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white/85">
        Photo: Andreea Pop / Unsplash
      </span>
    </section>
  );
}

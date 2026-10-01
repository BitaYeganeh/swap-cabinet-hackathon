import { LuArrowRight, LuShieldCheck, LuSparkles, LuTruck } from "react-icons/lu";
import heroPhoto from "../assets/hero-rack.jpg";
import { btn } from "../lib/ui";
import { useChromeHeight } from "../lib/useHeaderHeight";

const TRUST_POINTS = [
  { icon: LuTruck, label: "Shipping or pickup" },
  { icon: LuShieldCheck, label: "Condition checked" },
];

// Full-width photo in softened, neutral colour so the copy and button stand out; a white fade gives the copy a clean "white side"
// (from the left on desktop, the top on phones). Sized to exactly the space between
// header and footer so the whole home page fits on one screen; on a very short
// window the copy scrolls inside the hero instead.
// The hero's one call to action: jump into the header search, where the AI
// turns a plain description into results.
const focusSearch = () => {
  const input = document.querySelector<HTMLInputElement>('form[role="search"] input');
  input?.focus();
  input?.scrollIntoView({ block: "nearest" });
};

export default function Hero() {
  const chromeHeight = useChromeHeight();

  return (
    <section
      style={{ height: `calc(100svh - ${chromeHeight}px)` }}
      className="relative isolate flex min-h-[320px] flex-col overflow-hidden bg-white"
    >
      <img
        src={heroPhoto}
        alt="Second-hand shirts and jackets hanging on a clothing rail"
        width={2400}
        height={1600}
        fetchPriority="high"
        className="absolute inset-0 -z-20 size-full object-cover object-[70%_center] saturate-75 brightness-105"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-white from-45% via-white/80 via-70% to-white/10 lg:bg-linear-to-r lg:from-white lg:from-30% lg:via-white/85 lg:via-50% lg:to-transparent lg:to-75%" />

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 overflow-y-auto px-4 pt-8 pb-40 sm:px-6 sm:pb-48 lg:items-end lg:pt-6 lg:pb-14">
        <div className="max-w-[680px] animate-fade-up">
          <h1 className="font-hero text-[clamp(34px,4.8vw,68px)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            Pre-loved style,
            <br />
            <em className="text-accent not-italic">fresh finds</em> every day
          </h1>

          <button type="button" onClick={focusSearch} className={`${btn.primary} group mt-8 h-12 px-6 text-base`}>
            <LuSparkles className="size-[18px]" />
            Describe what you need
            <LuArrowRight className="size-[18px] transition group-hover:translate-x-0.5" />
          </button>

          {/* Selling points as plain reassurance under the call to action. */}
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink-2">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <Icon className="size-[18px] text-accent" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <span className="absolute right-3 bottom-2 rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white/85">
        Photo: Andreea Pop / Unsplash
      </span>
    </section>
  );
}

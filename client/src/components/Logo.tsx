import { PiCoatHangerBold } from "react-icons/pi";
import { Link } from "react-router";
import { BRAND } from "../lib/ui";

// The header logo carries the "Second-hand marketplace" tagline under the name.
export default function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link
      to="/"
      className={`inline-flex shrink-0 items-center gap-2.5 font-display font-semibold tracking-tight text-ink no-underline ${
        small ? "text-xl" : "text-[22px] sm:text-[26px]"
      }`}
      aria-label={`${BRAND} home`}
    >
      <span
        className={`grid place-items-center rounded-[10px] bg-ink text-gold ${
          small ? "size-7" : "size-9"
        }`}
      >
        <PiCoatHangerBold className={small ? "size-4" : "size-5"} />
      </span>
      {small ? (
        BRAND
      ) : (
        <span className="flex flex-col leading-none">
          {BRAND}
          <span className="mt-1 font-sans text-[9px] font-bold tracking-[0.16em] text-accent uppercase sm:text-[10px]">
            Second-hand marketplace
          </span>
        </span>
      )}
    </Link>
  );
}

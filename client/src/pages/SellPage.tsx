import { LuArrowLeft, LuTag } from "react-icons/lu";
import { Link } from "react-router";
import { BRAND, btn, heading } from "../lib/ui";

// "/sell" — where sellers will add a listing's details. Placeholder until the
// listing form is designed.
export default function SellPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <title>{`Sell your clothes · ${BRAND}`}</title>
      <span className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
        <LuTag className="size-6" />
      </span>
      <h1 className={`${heading.page} mt-5`}>Listing details</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        Soon you'll be able to list your clothes here: add photos, the category, size, condition and price, and
        we'll publish them to the marketplace.
      </p>
      <Link to="/" className={`${btn.ghost} mt-8 no-underline`}>
        <LuArrowLeft className="size-4" /> Back to shop
      </Link>
    </section>
  );
}

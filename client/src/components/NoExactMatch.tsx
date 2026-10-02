import type { ReactNode } from "react";
import { LuTriangleAlert } from "react-icons/lu";
import { Link } from "react-router";

// Amber notice above the results whenever they aren't an exact match for the
// search: an AI search that had to widen its filters, or a search where only
// items similar in meaning were found. Deliberately louder than the AI note.
export default function NoExactMatch({
  query,
  children,
  exactTo,
}: {
  query: string;
  /** What we did instead, in plain words. */
  children: ReactNode;
  /** Link to the exact search, when that differs from what's shown. */
  exactTo?: string;
}) {
  return (
    <div
      role="status"
      className="mb-4 flex gap-3 rounded-2xl border border-[#f0c674] bg-[#fdf3e1] px-4 py-4 sm:gap-4 sm:px-5"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f8dfa8] text-[#a5620b]">
        <LuTriangleAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-ink">
          No exact match for <span className="break-words">“{query}”</span>
        </p>
        <p className="mt-0.5 text-sm text-ink-2">{children}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {exactTo && (
            <Link
              to={exactTo}
              className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white no-underline transition hover:bg-black"
            >
              Search the exact words
            </Link>
          )}
          <Link
            to="/"
            className="inline-flex h-9 items-center rounded-full border border-ink/20 bg-white px-4 text-sm font-semibold text-ink no-underline transition hover:border-ink/40"
          >
            Clear search
          </Link>
        </div>
      </div>
    </div>
  );
}

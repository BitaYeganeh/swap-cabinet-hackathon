import type { ReactNode } from "react";
import { LuHeart, LuSparkles } from "react-icons/lu";
import { PiCoatHanger } from "react-icons/pi";
import { Link, useSearchParams } from "react-router";
import type { Listing } from "../lib/api";
import { conditionLabel, formatMoney, isWanted } from "../lib/format";
import { toggleFavorite, useFavorites } from "../lib/favorites";
import { browseUrl } from "../lib/search";
import { formatSize, useSizeSystem } from "../lib/sizes";

// H&M-style product tile: a tall photo with the size tagged bottom-left and the
// heart bottom-right, then the title and price on the plain page below.
// `onOpen` lets a page show the popup itself instead of opening it through the
// URL (the photo search page keeps its results in memory, not in the URL).
export default function ListingCard({
  listing,
  reason,
  onOpen,
}: {
  listing: Listing;
  reason?: string;
  onOpen?: (listing: Listing) => void;
}) {
  const [searchParams] = useSearchParams();
  const favorite = !!useFavorites()[listing.id];
  const image = listing.images[0];
  const wanted = isWanted(listing);
  const size = formatSize(listing.size, listing.category, useSizeSystem());
  const meta = [listing.condition && conditionLabel(listing.condition), listing.brand, listing.city].filter(Boolean);

  return (
    <article className="group relative flex min-w-0 flex-col">
      {/* Opens the details popup on the same page. */}
      <Link
        to={browseUrl(searchParams, { item: listing.id })}
        state={{ openedItem: true }}
        preventScrollReset
        onClick={(e) => {
          if (!onOpen) return;
          e.preventDefault();
          onOpen(listing);
        }}
        aria-label={listing.title}
        className="flex flex-1 flex-col no-underline"
      >
        <div className="relative aspect-3/4 overflow-hidden bg-surface-2">
          {image ? (
            <img
              src={image.url}
              srcSet={`${image.url} 400w, ${image.url2x} 800w`}
              sizes="(max-width: 640px) 50vw, 260px"
              alt={listing.title}
              loading="lazy"
              className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="stripes flex size-full flex-col items-center justify-center gap-2 p-3 text-center text-xs font-medium text-ink-3">
              <PiCoatHanger className="size-8" />
              <span>{wanted ? "Looking for this item" : "No photo"}</span>
            </div>
          )}

          <div className="absolute top-2 left-2 flex gap-1.5">
            {wanted ? (
              <span className="bg-gold px-2 py-0.5 text-[11px] font-bold tracking-wide text-ink uppercase">Wanted</span>
            ) : (
              listing.condition === "like-new" && (
                <span className="bg-accent px-2 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">
                  Like new
                </span>
              )
            )}
          </div>

          {size && (
            <span className="absolute bottom-0 left-0 bg-white/85 px-2 py-0.5 text-[13px] text-ink">{size}</span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-0.5 pt-2.5">
          <h3 className="line-clamp-2 text-[13px] leading-snug tracking-wide uppercase sm:text-sm">{listing.title}</h3>
          <p className={listing.price ? "text-[15px] font-bold" : "text-[13px] font-semibold text-ink-2"}>
            {wanted ? "Wanted" : listing.price ? formatMoney(listing.price) : "Open to offers"}
          </p>
          {meta.length > 0 && <p className="truncate text-xs text-ink-3">{meta.join(" · ")}</p>}

          {reason && (
            <p className="mt-1 flex gap-1 bg-accent-soft px-1.5 py-1 text-[11px] leading-snug text-accent sm:text-xs">
              <LuSparkles className="mt-px size-3 shrink-0" aria-label="Why the AI picked this" />
              {reason}
            </p>
          )}
        </div>
      </Link>

      {/* Sits over the photo's bottom-right corner (same 3:4 box), outside the link. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-3/4">
        <button
          type="button"
          onClick={() => toggleFavorite(listing)}
          aria-pressed={favorite}
          aria-label={favorite ? "Remove from saved" : "Save for later"}
          className={`pointer-events-auto absolute right-1.5 bottom-1.5 p-1.5 transition hover:scale-110 ${
            favorite ? "text-warm" : "text-ink"
          }`}
        >
          {/* Dark outline with a white fill (as H&M does): reads on light and dark photos alike. */}
          <LuHeart className={`size-5 stroke-[1.75] ${favorite ? "fill-current" : "fill-white"}`} />
        </button>
      </div>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <div className="shimmer aspect-3/4" />
      <div className="flex flex-col gap-2 pt-2.5">
        <div className="shimmer h-4 w-[85%] rounded-md" />
        <div className="shimmer h-4 w-[30%] rounded-md" />
        <div className="shimmer h-3 w-3/5 rounded-md" />
      </div>
    </div>
  );
}

export function ListingGrid({ children, dimmed = false }: { children: ReactNode; dimmed?: boolean }) {
  return (
    <div
      aria-busy={dimmed}
      className={`grid grid-cols-2 gap-x-3 gap-y-8 transition-opacity sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-x-6 sm:gap-y-12 ${
        dimmed ? "pointer-events-none opacity-45" : ""
      }`}
    >
      {children}
    </div>
  );
}

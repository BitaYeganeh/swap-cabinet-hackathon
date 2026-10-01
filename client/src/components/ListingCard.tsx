import type { ReactNode } from "react";
import { LuHeart, LuMapPin, LuTruck } from "react-icons/lu";
import { PiCoatHanger } from "react-icons/pi";
import { Link } from "react-router";
import type { Listing } from "../lib/api";
import { toggleFavorite, useFavorites } from "../lib/favorites";
import {
  categoryLabel,
  conditionLabel,
  formatMoney,
  genderLabel,
  isWanted,
  subcategoryLabel,
} from "../lib/format";

const chip = "rounded-md bg-surface-2 px-1.5 py-px text-[11px] font-medium text-ink-2 sm:text-xs";

export default function ListingCard({ listing }: { listing: Listing }) {
  const favorite = !!useFavorites()[listing.id];
  const image = listing.images[0];
  const wanted = isWanted(listing);

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <Link to={`/listings/${listing.id}`} className="flex flex-1 flex-col no-underline" aria-label={listing.title}>
        <div className="relative aspect-square overflow-hidden bg-surface-2">
          {image ? (
            <img
              src={image.url}
              srcSet={`${image.url} 400w, ${image.url2x} 800w`}
              sizes="(max-width: 640px) 50vw, 220px"
              alt={listing.title}
              loading="lazy"
              className="size-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="stripes flex size-full flex-col items-center justify-center gap-2 p-3 text-center text-xs font-medium text-ink-3">
              <PiCoatHanger className="size-8" />
              <span>{wanted ? "Looking for this item" : "No photo"}</span>
            </div>
          )}

          <div className="absolute top-2 left-2 flex gap-1.5">
            {wanted ? (
              <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-ink">Wanted</span>
            ) : (
              listing.condition === "like-new" && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
                  Like new
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 px-2.5 pt-2 pb-2.5 sm:px-3 sm:pt-2.5 sm:pb-3">
          <p className="truncate text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
            {categoryLabel(listing.category)}
            {listing.gender && listing.gender !== "unisex" && <> · {genderLabel(listing.gender)}</>}
            {listing.subcategory && <> · {subcategoryLabel(listing.subcategory)}</>}
          </p>
          <h3 className="line-clamp-2 text-[13px] leading-snug font-semibold sm:text-sm">{listing.title}</h3>

          <div className="flex flex-wrap gap-1">
            {listing.condition && listing.condition !== "like-new" && (
              <span className={chip}>{conditionLabel(listing.condition)}</span>
            )}
            {listing.size && <span className={chip}>Size {listing.size.toUpperCase()}</span>}
            {listing.brand && <span className={chip}>{listing.brand}</span>}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
            <span
              className={
                listing.price
                  ? "text-[15px] font-bold tracking-tight sm:text-base"
                  : "text-[13px] font-semibold text-ink-2"
              }
            >
              {listing.price ? formatMoney(listing.price) : "Open to offers"}
            </span>
            <span className="hidden min-w-0 items-center gap-1 text-xs text-ink-3 sm:inline-flex">
              {listing.shippingEnabled && (
                <span title="Shipping available" className="mr-1 inline-flex text-accent">
                  <LuTruck className="size-3.5" />
                </span>
              )}
              {listing.city && (
                <>
                  <LuMapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{listing.city}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggleFavorite(listing)}
        aria-pressed={favorite}
        aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
        className={`absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/90 shadow-xs transition hover:scale-110 ${
          favorite ? "text-warm" : "text-ink"
        }`}
      >
        <LuHeart className={`size-4 ${favorite ? "fill-current" : ""}`} />
      </button>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface" aria-hidden="true">
      <div className="shimmer aspect-square" />
      <div className="flex flex-col gap-2 p-3">
        <div className="shimmer h-3 w-2/5 rounded-md" />
        <div className="shimmer h-4 w-[85%] rounded-md" />
        <div className="shimmer h-3 w-3/5 rounded-md" />
        <div className="shimmer mt-2 h-4 w-[30%] rounded-md" />
      </div>
    </div>
  );
}

export function ListingGrid({ children, dimmed = false }: { children: ReactNode; dimmed?: boolean }) {
  return (
    <div
      aria-busy={dimmed}
      className={`grid grid-cols-2 gap-x-2.5 gap-y-3.5 transition-opacity sm:grid-cols-[repeat(auto-fill,minmax(175px,1fr))] sm:gap-x-4 sm:gap-y-5 ${
        dimmed ? "pointer-events-none opacity-45" : ""
      }`}
    >
      {children}
    </div>
  );
}

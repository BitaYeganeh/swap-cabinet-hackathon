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
  isWanted,
  subcategoryLabel,
} from "../lib/format";

const chip = "rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2";

export default function ListingCard({ listing }: { listing: Listing }) {
  const favorite = !!useFavorites()[listing.id];
  const image = listing.images[0];
  const wanted = isWanted(listing);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xs transition duration-200 hover:-translate-y-1 hover:shadow-card">
      <Link to={`/listings/${listing.id}`} className="flex flex-1 flex-col no-underline" aria-label={listing.title}>
        <div className="relative aspect-4/5 overflow-hidden bg-surface-2">
          {image ? (
            <img
              src={image.url}
              srcSet={`${image.url} 400w, ${image.url2x} 800w`}
              sizes="(max-width: 640px) 50vw, 300px"
              alt={listing.title}
              loading="lazy"
              className="size-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="stripes flex size-full flex-col items-center justify-center gap-2.5 p-4 text-center text-[13px] font-medium text-ink-3">
              <PiCoatHanger className="size-10" />
              <span>{wanted ? "Looking for this item" : "No photo"}</span>
            </div>
          )}

          <div className="absolute top-3 left-3 flex gap-1.5">
            {wanted ? (
              <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-ink">Wanted</span>
            ) : (
              listing.condition === "like-new" && (
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
                  Like new
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-3 pt-2.5 pb-3 sm:px-4 sm:pt-3.5 sm:pb-4">
          <p className="text-xs font-semibold tracking-wider text-ink-3 uppercase">
            {categoryLabel(listing.category)}
            {listing.subcategory && <> · {subcategoryLabel(listing.subcategory)}</>}
          </p>
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold sm:text-[15px]">{listing.title}</h3>

          <div className="flex flex-wrap gap-1.5">
            {listing.condition && listing.condition !== "like-new" && (
              <span className={chip}>{conditionLabel(listing.condition)}</span>
            )}
            {listing.size && <span className={chip}>Size {listing.size.toUpperCase()}</span>}
            {listing.brand && <span className={chip}>{listing.brand}</span>}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span
              className={
                listing.price
                  ? "text-base font-bold tracking-tight sm:text-[19px]"
                  : "text-sm font-semibold text-ink-2"
              }
            >
              {listing.price ? formatMoney(listing.price) : "Open to offers"}
            </span>
            <span className="hidden items-center gap-1 text-[13px] text-ink-3 sm:inline-flex">
              {listing.shippingEnabled && (
                <span title="Shipping available" className="mr-1.5 inline-flex text-accent">
                  <LuTruck className="size-4" />
                </span>
              )}
              {listing.city && (
                <>
                  <LuMapPin className="size-[15px]" />
                  {listing.city}
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
        className={`absolute top-2.5 right-2.5 grid size-[34px] place-items-center rounded-full bg-white/90 shadow-xs transition hover:scale-110 sm:size-[38px] ${
          favorite ? "text-warm" : "text-ink"
        }`}
      >
        <LuHeart className={`size-[18px] ${favorite ? "fill-current" : ""}`} />
      </button>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface" aria-hidden="true">
      <div className="shimmer aspect-4/5" />
      <div className="flex flex-col gap-2.5 p-4">
        <div className="shimmer h-3 w-2/5 rounded-md" />
        <div className="shimmer h-4 w-[85%] rounded-md" />
        <div className="shimmer h-3 w-3/5 rounded-md" />
        <div className="shimmer mt-3.5 h-[18px] w-[30%] rounded-md" />
      </div>
    </div>
  );
}

export function ListingGrid({ children, dimmed = false }: { children: ReactNode; dimmed?: boolean }) {
  return (
    <div
      aria-busy={dimmed}
      className={`grid grid-cols-2 gap-x-3 gap-y-4 transition-opacity sm:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] sm:gap-x-5 sm:gap-y-7 ${
        dimmed ? "pointer-events-none opacity-45" : ""
      }`}
    >
      {children}
    </div>
  );
}

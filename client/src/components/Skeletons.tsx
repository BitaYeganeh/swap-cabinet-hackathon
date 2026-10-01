import { ListingCardSkeleton, ListingGrid } from "./ListingCard";

// Shown on first page load while a route's loader is still fetching.
export function BrowseSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6">
      <div className="shimmer mb-2 h-8 w-56 rounded-lg" />
      <div className="shimmer mb-6 h-4 w-20 rounded-md" />
      <ListingGrid>
        {Array.from({ length: 8 }, (_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </ListingGrid>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      <div className="shimmer aspect-4/3 rounded-[22px]" />
      <div className="flex flex-col gap-4">
        <div className="shimmer h-3 w-1/4 rounded-md" />
        <div className="shimmer h-9 w-4/5 rounded-lg" />
        <div className="shimmer h-8 w-1/4 rounded-lg" />
        <div className="shimmer h-24 w-full rounded-lg" />
        <div className="shimmer h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

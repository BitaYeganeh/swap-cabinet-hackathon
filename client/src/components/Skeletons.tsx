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

import { LuHeart } from "react-icons/lu";
import { Link } from "react-router";
import EmptyState from "../components/EmptyState";
import ListingCard, { ListingGrid } from "../components/ListingCard";
import { useFavorites } from "../lib/favorites";
import { BRAND, btn } from "../lib/ui";

export default function SavedPage() {
  const saved = Object.values(useFavorites());

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8">
      <title>{`Your favourites · ${BRAND}`}</title>

      <div className="mb-5">
        <h1 className="font-display text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
          Your favourites
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          {saved.length} saved {saved.length === 1 ? "item" : "items"}
        </p>
      </div>

      {saved.length === 0 ? (
        <EmptyState
          icon={<LuHeart />}
          title="No favourites yet"
          action={
            <Link to="/" className={btn.primary}>
              Browse items
            </Link>
          }
        >
          Tap the heart on any item to save it here.
        </EmptyState>
      ) : (
        <ListingGrid>
          {saved.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ListingGrid>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getListings, type Listing, type SearchParams } from "../lib/api";
import { CONDITIONS, GENDERS, TYPES, categoryLabel, isWanted } from "../lib/format";
import { browseUrl } from "../lib/search";

// Menu links start a fresh search, like a store's department menu.
const linkTo = (category: string, changes: Partial<SearchParams> = {}) =>
  browseUrl(new URLSearchParams(), { category, ...changes });

type MenuLink = { label: string; to: string; highlight?: boolean; strong?: boolean };

function groupsFor(category: string): MenuLink[][] {
  const typeLinks = (changes: Partial<SearchParams> = {}) =>
    TYPES.map((t) => ({ label: t.label, to: linkTo(category, { ...changes, type: t.value }) }));

  const featured: MenuLink[] = [
    { label: "New in", to: linkTo(category, { sort: "newest" }) },
    { label: "Like new", to: linkTo(category, { condition: "like-new" }) },
    { label: "Under €25", to: linkTo(category, { maxPrice: "25" }), highlight: true },
  ];

  const products: MenuLink[][] =
    category === "kids"
      ? GENDERS.map((g) => [
          { label: g.label, to: linkTo(category, { gender: g.value }), strong: true },
          ...typeLinks({ gender: g.value }),
        ])
      : [[{ label: `View all`, to: linkTo(category) }, ...typeLinks()]];

  const conditions = CONDITIONS.filter((c) => c.value !== "like-new").map((c) => ({
    label: c.label,
    to: linkTo(category, { condition: c.value }),
  }));

  return [featured, ...products, conditions];
}

type Tile = { key: string; src: string; label: string; to: string };

// One photo per product type (plus the newest arrival), so each tile shows what
// it links to — the Men menu shows men's tops, shoes… Kept for the session so
// re-opening a menu doesn't refetch.
const tilesCache = new Map<string, Tile[]>();

// Shimmer squares shown while the tile photos load.
const PLACEHOLDER_TILES: Tile[] = [1, 2, 3, 4, 5, 6].map((n) => ({ key: `loading-${n}`, src: "", label: "", to: "" }));

const photoOf = (listing?: Listing) => listing?.images[0] && (listing.images[0].url || listing.images[0].url2x);

function useTiles(category: string) {
  const [tiles, setTiles] = useState(() => tilesCache.get(category) ?? null);

  useEffect(() => {
    if (tilesCache.has(category)) return;
    const controller = new AbortController();
    const withPhotos = (params: Partial<SearchParams>) =>
      getListings({ category, ...params }, controller.signal).then(({ listings }) =>
        listings.filter((l) => photoOf(l) && !isWanted(l))
      );

    Promise.all([
      ...TYPES.map((t) => withPhotos({ type: t.value }).then((ls) => ({ ...t, listing: ls[0], changes: { type: t.value } }))),
      withPhotos({ sort: "newest" }),
    ])
      .then((all) => {
        const byType = all.slice(0, TYPES.length) as { value: string; label: string; listing?: Listing; changes: Partial<SearchParams> }[];
        // "New in" uses the newest item whose photo isn't already on another tile.
        const shown = new Set(byType.map((r) => r.listing?.id));
        const newest = (all[TYPES.length] as Listing[]).find((l) => !shown.has(l.id));
        const results = [...byType, { value: "new", label: "New in", listing: newest, changes: { sort: "newest" } }];
        const next = results
          .filter((r) => r.listing)
          .map((r) => ({ key: r.value, src: photoOf(r.listing)!, label: r.label, to: linkTo(category, r.changes) }));
        tilesCache.set(category, next);
        setTiles(next);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [category]);

  return tiles;
}

const linkClass = (link: MenuLink) =>
  `block py-[5px] text-[17px] uppercase no-underline transition hover:text-accent hover:underline hover:underline-offset-4 ${
    link.highlight ? "text-warm" : "text-ink"
  } ${link.strong ? "font-semibold text-accent" : ""}`;

// Contents of the left-hand flyout opened from a category tab, H&M style:
// grouped links on the left, a grid of small photo tiles (one per type) on the right.
export default function CategoryMenu({ category }: { category: string }) {
  const label = categoryLabel(category);
  const tiles = useTiles(category);

  return (
    <div className="grid grid-cols-[1fr_minmax(0,340px)] gap-10 px-10 pt-9 pb-12">
      <nav aria-label={`${label} categories`} className="grid content-start gap-10">
        {groupsFor(category).map((group, i) => (
          <ul key={i}>
            {group.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass(link)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </nav>

      <div className="grid content-start grid-cols-2 gap-x-3 gap-y-4">
        {(tiles ?? PLACEHOLDER_TILES).map((tile) =>
          tile.src ? (
            <Link key={tile.key} to={tile.to} className="group block no-underline">
              <div className="aspect-square overflow-hidden rounded-xl bg-surface-2">
                <img
                  src={tile.src}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 text-[13px] font-semibold tracking-wide text-ink uppercase group-hover:text-accent">
                {tile.label}
              </p>
            </Link>
          ) : (
            <div key={tile.key} aria-hidden="true">
              <div className="shimmer aspect-square rounded-xl" />
              <div className="shimmer mt-2 h-3 w-1/2 rounded" />
            </div>
          )
        )}
      </div>
    </div>
  );
}

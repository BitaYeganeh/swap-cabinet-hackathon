import { Link } from "react-router";
import type { SearchParams } from "../lib/api";
import { CONDITIONS, GENDERS, TYPES, categoryLabel } from "../lib/format";
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
    { label: "Under €15", to: linkTo(category, { maxPrice: "15" }), highlight: true },
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

// Hand-picked photo per category and tile ("men-shoes.jpg", "men-new.jpg"), so
// every tile clearly shows what it links to; sellers' own photos often show
// other things too. Free Unsplash photos, ids listed in assets/menu/CREDITS.md.
const MENU_PHOTOS = import.meta.glob<string>("../assets/menu/*.jpg", { eager: true, import: "default" });
const menuPhoto = (category: string, type: string) => MENU_PHOTOS[`../assets/menu/${category}-${type}.jpg`];

function useTiles(category: string): Tile[] {
  const tiles = [
    ...TYPES.map((t) => ({ key: t.value, label: t.label, to: linkTo(category, { type: t.value }) })),
    { key: "new", label: "New in", to: linkTo(category, { sort: "newest" }) },
  ];
  return tiles.flatMap((tile) => {
    const src = menuPhoto(category, tile.key);
    return src ? [{ ...tile, src }] : [];
  });
}

const linkClass = (link: MenuLink) =>
  `block py-1 text-sm tracking-wide uppercase no-underline transition hover:text-accent hover:underline hover:underline-offset-4 ${
    link.highlight ? "text-warm" : "text-ink"
  } ${link.strong ? "font-semibold text-accent" : ""}`;

// Contents of the left-hand flyout opened from a category tab, H&M style:
// grouped links on the left, a grid of small photo tiles (one per type) on the right.
export default function CategoryMenu({ category }: { category: string }) {
  const label = categoryLabel(category);
  const tiles = useTiles(category);

  return (
    <div className="grid grid-cols-[1fr_minmax(0,340px)] gap-10 px-10 pt-9 pb-12">
      <nav aria-label={`${label} categories`} className="grid content-start gap-7">
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
        {tiles.map((tile) =>
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

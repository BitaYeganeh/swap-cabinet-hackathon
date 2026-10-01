import { useEffect, useState } from "react";
import { Link } from "react-router";
import heroPhoto from "../assets/hero-rack.jpg";
import { getListings, type Listing, type SearchParams } from "../lib/api";
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

// Newest listings with photos per category, kept for the session so
// re-opening a menu doesn't refetch.
const picksCache = new Map<string, Listing[]>();

function usePicks(category: string) {
  const [picks, setPicks] = useState(() => picksCache.get(category) ?? null);

  useEffect(() => {
    if (picksCache.has(category)) return;
    const controller = new AbortController();
    getListings({ category, sort: "newest" }, controller.signal)
      .then(({ listings }) => {
        const withPhotos = listings.filter((l) => l.images[0]).slice(0, 2);
        picksCache.set(category, withPhotos);
        setPicks(withPhotos);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [category]);

  return picks;
}

const linkClass = (link: MenuLink) =>
  `block py-[5px] text-[17px] uppercase no-underline transition hover:underline hover:underline-offset-4 ${
    link.highlight ? "text-warm" : "text-ink"
  } ${link.strong ? "font-semibold" : ""}`;

// Contents of the left-hand flyout opened from a category tab, H&M style:
// grouped links on the left, photo tiles on the right.
export default function CategoryMenu({ category }: { category: string }) {
  const label = categoryLabel(category);
  const picks = usePicks(category);

  const tiles =
    picks && picks.length > 0
      ? picks.map((l) => ({ key: l.id, src: l.images[0].url2x || l.images[0].url, title: l.title, to: linkTo(category, { keywords: l.title }) }))
      : [{ key: "hero", src: heroPhoto, title: "New in", to: linkTo(category, { sort: "newest" }) }];

  return (
    <div className="grid grid-cols-[1fr_minmax(0,300px)] gap-10 px-10 pt-9 pb-12">
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

      <div className="grid content-start gap-8">
        {tiles.map((tile) => (
          <Link key={tile.key} to={tile.to} className="group block no-underline">
            <div className="aspect-[2/3] overflow-hidden bg-surface-2">
              <img
                src={tile.src}
                alt=""
                className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <p className="mt-3 line-clamp-1 text-[17px] text-ink uppercase">{tile.title}</p>
            <p className="text-sm text-ink-2 uppercase">{label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

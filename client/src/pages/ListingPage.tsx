import { Suspense, lazy, useState } from "react";
import {
  LuArrowLeft,
  LuChevronRight,
  LuHeart,
  LuLeaf,
  LuMapPin,
  LuStore,
  LuTruck,
} from "react-icons/lu";
import { PiCoatHanger } from "react-icons/pi";
import { Link, useLoaderData, useLocation, useNavigate } from "react-router";
import ListingCard, { ListingGrid } from "../components/ListingCard";
import type { Listing } from "../lib/api";
import { toggleFavorite, useFavorites } from "../lib/favorites";
import {
  categoryLabel,
  conditionLabel,
  formatMoney,
  genderLabel,
  isWanted,
  splitPhotoCredit,
  subcategoryLabel,
  timeAgo,
} from "../lib/format";
import { SIZE_SYSTEMS, setSizeSystem, sizeInfo, useSizeSystem } from "../lib/sizes";
import { BRAND, btn } from "../lib/ui";
import type { listingLoader } from "../loaders";

// Leaflet is fairly large; only download it on listing pages.
const ListingMap = lazy(() => import("../components/ListingMap"));

export default function ListingPage() {
  const { listing, related } = useLoaderData<typeof listingLoader>();

  return (
    <>
      <title>{`${listing.title} · ${BRAND}`}</title>
      {/* Keyed so the image gallery resets when moving between listings. */}
      <ListingDetail key={listing.id} listing={listing} />

      {related.length > 0 && listing.category && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
              More in {categoryLabel(listing.category)}
            </h2>
            <Link
              to={`/category/${listing.category}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent no-underline hover:underline"
            >
              View all <LuChevronRight className="size-4" />
            </Link>
          </div>
          <ListingGrid>
            {related.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </ListingGrid>
        </section>
      )}
    </>
  );
}

const deliveryPill =
  "inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-semibold text-accent [&>svg]:size-[18px]";

function ListingDetail({ listing }: { listing: Listing }) {
  const navigate = useNavigate();
  const location = useLocation();
  const favorite = !!useFavorites()[listing.id];
  const [imageIndex, setImageIndex] = useState(0);

  const image = listing.images[imageIndex];
  const wanted = isWanted(listing);
  const size = sizeInfo(listing.size, listing.category);
  const { text, credit } = splitPhotoCredit(listing.description || "");
  // "default" means the user landed here directly, so there is no page to go back to.
  const canGoBack = location.key !== "default";

  const details = [
    [
      "Category",
      [
        categoryLabel(listing.category),
        listing.gender !== "unisex" && genderLabel(listing.gender),
        subcategoryLabel(listing.subcategory),
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    ["Condition", conditionLabel(listing.condition)],
    // Sizes with known EU/UK/US equivalents get their own block below.
    ["Size", size && !size.conversion ? size.label : undefined],
    ["Brand", listing.brand],
    ["Colour", listing.color && listing.color.charAt(0).toUpperCase() + listing.color.slice(1)],
    ["Material", listing.material],
    ["Care", listing.careInstructions],
  ].filter(([, value]) => value);

  const mapsUrl = listing.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address)}`
    : null;
  const geo = listing.geolocation;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 pb-14 sm:px-6 sm:pt-7">
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-ink-3" aria-label="Breadcrumb">
        {canGoBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mr-3 inline-flex items-center gap-1.5 font-semibold text-ink hover:text-accent"
          >
            <LuArrowLeft className="size-4" /> Back
          </button>
        )}
        <Link to="/" className="no-underline hover:text-ink">
          Home
        </Link>
        {listing.category && (
          <>
            <LuChevronRight className="size-3.5" />
            <Link to={`/category/${listing.category}`} className="no-underline hover:text-ink">
              {categoryLabel(listing.category)}
            </Link>
          </>
        )}
        <LuChevronRight className="size-3.5" />
        <span className="line-clamp-1 text-ink-2">{listing.title}</span>
      </nav>

      <div className="grid animate-fade-up gap-6 sm:gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div className="min-w-0 lg:sticky lg:top-[140px] lg:self-start">
          <div className="overflow-hidden rounded-[22px] bg-surface-2">
            {image ? (
              <img src={image.url2x} alt={listing.title} className="aspect-4/3 w-full object-cover" />
            ) : (
              <div className="stripes flex aspect-4/3 flex-col items-center justify-center gap-2.5 text-[15px] font-medium text-ink-3">
                <PiCoatHanger className="size-14" />
                {wanted ? "This is a wanted request" : "No photo"}
              </div>
            )}
          </div>
          {listing.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              {listing.images.map((img, i) => (
                <button
                  type="button"
                  key={img.url}
                  onClick={() => setImageIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 sm:size-16 ${
                    i === imageIndex ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-xs font-semibold tracking-wider text-ink-3 uppercase">
            {wanted ? "Wanted" : categoryLabel(listing.category)}
            {listing.createdAt && <> · Listed {timeAgo(listing.createdAt).toLowerCase()}</>}
          </p>
          <h1 className="-mt-2 font-display text-[26px] leading-tight font-medium tracking-tight break-words sm:text-4xl">
            {listing.title}
          </h1>

          <div className="flex flex-wrap items-baseline gap-2.5 text-2xl font-bold sm:text-[28px]">
            {listing.price ? formatMoney(listing.price) : "Open to offers"}
            {listing.shippingEnabled && listing.shippingPrice != null && (
              <span className="text-sm font-medium text-ink-3">
                + {formatMoney({ amount: listing.shippingPrice, currency: listing.price?.currency })} shipping
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {listing.shippingEnabled && (
              <span className={deliveryPill}>
                <LuTruck /> Shipping available
              </span>
            )}
            {listing.pickupEnabled && (
              <span className={deliveryPill}>
                <LuStore /> Local pickup
              </span>
            )}
            {(listing.petFreeHome || listing.smokeFreeHome) && (
              <span className={deliveryPill}>
                <LuLeaf />
                {[listing.smokeFreeHome && "Smoke-free", listing.petFreeHome && "Pet-free"]
                  .filter(Boolean)
                  .join(" & ")}{" "}
                home
              </span>
            )}
          </div>

          {text && <p className="text-ink-2">{text}</p>}

          {listing.conditionDetails && (
            <p className="rounded-r-lg border-l-[3px] border-gold bg-cream px-3.5 py-3 text-sm text-ink-2">
              <strong className="text-ink">Condition notes:</strong> {listing.conditionDetails}
            </p>
          )}

          {details.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-y border-line py-4 [&_dd]:break-words">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{label}</dt>
                  <dd className="mt-0.5 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {size?.conversion && <SizeBlock kind={size.kind} label={size.label} conversion={size.conversion} />}

          <div className="flex flex-wrap items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-ink font-display text-xl text-gold">
              {(listing.sellerName || "?").charAt(0)}
            </div>
            <div>
              <div className="font-semibold">{listing.sellerName || "Marketplace member"}</div>
              {listing.city && (
                <div className="flex items-center gap-1 text-[13px] text-ink-3">
                  <LuMapPin className="size-3.5" /> {listing.city}
                </div>
              )}
            </div>
            {geo ? (
              <a href="#location" className={`${btn.ghostSmall} ml-auto`}>
                <LuMapPin className="size-4" /> View on map
              </a>
            ) : (
              mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className={`${btn.ghostSmall} ml-auto`}>
                  View on map
                </a>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => toggleFavorite(listing)}
            className={`${favorite ? btn.warm : btn.primary} w-full`}
          >
            <LuHeart className={`size-[18px] ${favorite ? "fill-current" : ""}`} />
            {favorite ? "Saved to favourites" : "Save to favourites"}
          </button>

          {geo && (
            <section id="location" className="scroll-mt-[150px] border-t border-line pt-5">
              <h2 className="mb-1 text-lg font-semibold">Item location</h2>
              {listing.address && (
                <p className="mb-3 flex items-start gap-1.5 text-sm text-ink-2">
                  <LuMapPin className="mt-0.5 size-4 shrink-0 text-accent" /> {listing.address}
                </p>
              )}
              <Suspense fallback={<div className="shimmer h-64 rounded-2xl sm:h-80" />}>
                <ListingMap lat={geo.lat} lng={geo.lng} title={listing.title} address={listing.address} />
              </Suspense>
            </section>
          )}

          {credit && (
            <p className="text-center text-xs text-ink-3">
              Photo by{" "}
              {credit.url ? (
                <a href={credit.url} target="_blank" rel="noreferrer">
                  {credit.name}
                </a>
              ) : (
                credit.name
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SizeBlock({
  kind,
  label,
  conversion,
}: {
  kind: "letter" | "shoe" | "kids";
  label: string;
  conversion: Record<(typeof SIZE_SYSTEMS)[number], string>;
}) {
  const system = useSizeSystem();
  const title = kind === "shoe" ? "Shoe size" : `Size · ${label}`;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{title}</h2>
        <span className="text-xs text-ink-3">Approximate conversion</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {SIZE_SYSTEMS.map((s) => (
          // Picking a system here also switches the sizes shown on cards.
          <button
            type="button"
            key={s}
            onClick={() => setSizeSystem(s)}
            aria-pressed={s === system}
            className={`rounded-xl border px-3 py-2 text-center transition ${
              s === system ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink-3"
            }`}
          >
            <div className={`text-[11px] font-semibold tracking-wide ${s === system ? "text-white/75" : "text-ink-3"}`}>
              {s}
            </div>
            <div className="font-semibold leading-tight">
              {conversion[s]}
              {kind === "kids" && s === "EU" && <span className="text-xs font-medium"> cm</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

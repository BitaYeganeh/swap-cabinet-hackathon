import { useEffect, useRef, useState } from "react";
import { LuCheck, LuExternalLink, LuHeart, LuLeaf, LuMapPin, LuStore, LuTruck, LuX } from "react-icons/lu";
import { PiCoatHanger } from "react-icons/pi";
import { getListing, type Listing } from "../lib/api";
import { addToBasket, checkoutUrl, setBasketOpen, useBasket } from "../lib/basket";
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
import { btn } from "../lib/ui";

type Props = {
  id: string;
  /** The listing when it's already on the page (a card was clicked), so it opens instantly. */
  known?: Listing;
  onClose: () => void;
};

// Item details in a popup over the single page, opened with "?item=<id>".
export default function ListingModal({ id, known, onClose }: Props) {
  const [fetched, setFetched] = useState<Listing | null>(null);
  const [failed, setFailed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listing = known ?? fetched;

  // Opened from a shared link: fetch the listing.
  useEffect(() => {
    if (known) return;
    const controller = new AbortController();
    getListing(id, controller.signal)
      .then(setFetched)
      // A cancelled request (closing quickly, or React re-running the effect) isn't a failure.
      .catch(() => !controller.signal.aborted && setFailed(true));
    return () => controller.abort();
  }, [id, known]);

  // Escape closes; the page behind doesn't scroll while the popup is open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-70 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={listing?.title ?? "Item details"}
        className="relative max-h-[92svh] w-full max-w-6xl animate-fade-up overflow-y-auto rounded-t-2xl bg-white shadow-float outline-none sm:rounded-2xl md:h-[min(92svh,820px)] md:overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-white/90 transition hover:bg-surface-2"
        >
          <LuX className="size-5" />
        </button>

        {listing ? (
          <ListingDetail key={listing.id} listing={listing} />
        ) : (
          <div className="grid min-h-[320px] place-items-center p-10 text-ink-3">
            {failed ? "Sorry, this item couldn't be loaded." : <div className="shimmer h-64 w-full rounded-2xl" />}
          </div>
        )}
      </div>
    </div>
  );
}

const sectionLabel = "text-[13px] font-semibold tracking-wider text-ink uppercase";

// Product-page layout (H&M style): a big photo on the left; on the right the
// title and price with the heart beside them, photo thumbnails, size boxes and
// a full-width add-to-basket button, then the rest of the details.
function ListingDetail({ listing }: { listing: Listing }) {
  const [imageIndex, setImageIndex] = useState(0);
  const inBasket = useBasket().some((item) => item.id === listing.id);
  const favorite = !!useFavorites()[listing.id];
  const system = useSizeSystem();

  const image = listing.images[imageIndex];
  const wanted = isWanted(listing);
  const size = sizeInfo(listing.size, listing.category);
  const { text, credit } = splitPhotoCredit(listing.description || "");
  const colour = listing.color && listing.color.charAt(0).toUpperCase() + listing.color.slice(1);

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
    ["Brand", listing.brand],
    ["Material", listing.material],
    ["Care", listing.careInstructions],
  ].filter(([, value]) => value);

  const delivery = [
    listing.shippingEnabled && { icon: LuTruck, text: "Shipping available" },
    listing.pickupEnabled && { icon: LuStore, text: "Local pickup" },
    (listing.petFreeHome || listing.smokeFreeHome) && {
      icon: LuLeaf,
      text: `${[listing.smokeFreeHome && "Smoke-free", listing.petFreeHome && "Pet-free"].filter(Boolean).join(" & ")} home`,
    },
  ].filter(Boolean) as { icon: typeof LuTruck; text: string }[];

  const mapsUrl = listing.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address)}`
    : null;

  const primaryButton = "inline-flex h-14 w-full items-center justify-center gap-2 text-[15px] font-semibold tracking-wide uppercase transition";

  return (
    <div className="grid md:h-full md:grid-cols-2">
      <div className="relative bg-surface-2 max-md:aspect-4/5">
        {image ? (
          <img src={image.url2x} alt={listing.title} className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="stripes absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-[15px] font-medium text-ink-3">
            <PiCoatHanger className="size-14" />
            {wanted ? "This is a wanted request" : "No photo"}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col px-6 pt-8 pb-10 sm:px-10 md:overflow-y-auto md:px-14 md:pt-16">
        <p className="mb-3 text-xs font-semibold tracking-wider text-ink-3 uppercase">
          {wanted ? "Wanted" : categoryLabel(listing.category)}
          {listing.createdAt && <> · Listed {timeAgo(listing.createdAt).toLowerCase()}</>}
        </p>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl leading-snug font-medium tracking-wide break-words uppercase sm:text-2xl">
              {listing.title}
            </h2>
            <p className="mt-1 text-xl font-bold">{listing.price ? formatMoney(listing.price) : "Open to offers"}</p>
            {listing.shippingEnabled && listing.shippingPrice != null && (
              <p className="text-sm text-ink-3">
                + {formatMoney({ amount: listing.shippingPrice, currency: listing.price?.currency })} shipping
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => toggleFavorite(listing)}
            aria-pressed={favorite}
            aria-label={favorite ? "Remove from saved" : "Save for later"}
            className={`shrink-0 p-1 transition hover:scale-110 ${favorite ? "text-warm" : "text-ink"}`}
          >
            <LuHeart className={`size-7 stroke-[1.6] ${favorite ? "fill-current" : ""}`} />
          </button>
        </div>

        {(colour || listing.images.length > 1) && (
          <div className="mt-8">
            {colour && (
              <p className={sectionLabel}>
                Colour: <span className="font-normal normal-case">{colour}</span>
              </p>
            )}
            {listing.images.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-0">
                {listing.images.map((img, i) => (
                  <button
                    type="button"
                    key={img.url}
                    onClick={() => setImageIndex(i)}
                    aria-label={`Show image ${i + 1}`}
                    className={`-ml-px size-20 overflow-hidden border first:ml-0 ${
                      i === imageIndex ? "relative z-1 border-ink" : "border-line opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {size && (
          <div className="mt-8">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className={sectionLabel}>{size.kind === "shoe" ? "Shoe size" : "Size"}</p>
              {size.conversion && <span className="text-xs text-ink-3">Approximate conversion</span>}
            </div>
            {size.conversion ? (
              <div className="grid grid-cols-3">
                {SIZE_SYSTEMS.map((s) => (
                  // Picking a system here also switches the sizes shown on cards.
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSizeSystem(s)}
                    aria-pressed={s === system}
                    className={`-ml-px h-14 border text-center first:ml-0 ${
                      s === system ? "relative z-1 border-ink" : "border-line hover:border-ink-3"
                    }`}
                  >
                    <span className="block text-[11px] font-semibold tracking-wide text-ink-3">{s}</span>
                    <span className="font-medium">
                      {size.conversion![s]}
                      {size.kind === "kids" && s === "EU" && " cm"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="inline-flex h-14 min-w-28 items-center justify-center border border-ink px-5 font-medium">
                {size.label}
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          {/* Wanted posts are requests, not items for sale: answer them on the marketplace instead. */}
          {wanted ? (
            <a
              href={checkoutUrl(listing)}
              target="_blank"
              rel="noreferrer"
              className={`${primaryButton} bg-accent text-white no-underline hover:bg-accent-hover`}
            >
              I have this — reply on the marketplace <LuExternalLink className="size-4" />
            </a>
          ) : inBasket ? (
            <button type="button" onClick={() => setBasketOpen(true)} className={`${primaryButton} border border-ink hover:bg-surface-2`}>
              <LuCheck className="size-[18px] text-accent" /> In your basket — view basket
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                addToBasket(listing);
                setBasketOpen(true);
              }}
              className={`${primaryButton} bg-accent text-white hover:bg-accent-hover`}
            >
              Add to basket
            </button>
          )}
        </div>

        {delivery.length > 0 && (
          <ul className="mt-5 grid gap-1.5 text-sm text-ink-2">
            {delivery.map(({ icon: Icon, text: line }) => (
              <li key={line} className="inline-flex items-center gap-2">
                <Icon className="size-4 text-accent" /> {line}
              </li>
            ))}
          </ul>
        )}

        {(text || listing.conditionDetails) && (
          <div className="mt-8 grid gap-4 border-t border-line pt-6">
            {text && <p className="text-ink-2">{text}</p>}
            {listing.conditionDetails && (
              <p className="border-l-[3px] border-gold bg-cream px-3.5 py-3 text-sm text-ink-2">
                <strong className="text-ink">Condition notes:</strong> {listing.conditionDetails}
              </p>
            )}
          </div>
        )}

        {details.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-line pt-6 [&_dd]:break-words">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{label}</dt>
                <dd className="mt-0.5 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
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
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className={`${btn.ghostSmall} ml-auto`}>
              <LuMapPin className="size-4" /> View on map
            </a>
          )}
        </div>

        {credit && (
          <p className="mt-6 text-xs text-ink-3">
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
  );
}

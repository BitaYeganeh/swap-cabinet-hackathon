import { useSyncExternalStore } from "react";
import type { Listing } from "./api";

// The basket lives in localStorage so it survives reloads; each item is a
// snapshot of the listing as it was added.
const STORAGE_KEY = "rethread:basket";

// Checkout happens on the team's Sharetribe marketplace, where buyers log in and
// pay with Stripe. One purchase per listing, as Sharetribe transactions are.
export const MARKETPLACE_URL =
  import.meta.env.VITE_MARKETPLACE_URL || "https://startuprefugeeshackathon20264-krwpjx.mysharetribe-test.com";

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";

export const checkoutUrl = (listing: Pick<Listing, "id" | "title">) =>
  `${MARKETPLACE_URL}/l/${slug(listing.title)}/${listing.id}`;

const listeners = new Set<() => void>();

function load(): Listing[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

let basket = load();

function save(next: Listing[]) {
  basket = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(basket));
  } catch {
    // Storage unavailable (private mode) — the basket lasts for this visit only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  // Keep other open tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    basket = load();
    listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Second-hand items are one-offs, so a listing is either in the basket or not.
export function addToBasket(listing: Listing) {
  if (!basket.some((item) => item.id === listing.id)) save([...basket, listing]);
}

export function removeFromBasket(id: string) {
  save(basket.filter((item) => item.id !== id));
}

export function useBasket() {
  return useSyncExternalStore(subscribe, () => basket);
}

// Whether the basket drawer is open; shared so the item popup can open it.
let drawerOpen = false;
const drawerListeners = new Set<() => void>();

export function setBasketOpen(open: boolean) {
  drawerOpen = open;
  drawerListeners.forEach((listener) => listener());
}

export function useBasketOpen() {
  return useSyncExternalStore(
    (listener) => {
      drawerListeners.add(listener);
      return () => drawerListeners.delete(listener);
    },
    () => drawerOpen
  );
}

import { useSyncExternalStore } from "react";
import type { Listing } from "./api";

// Favourites are kept in localStorage so they survive reloads and route changes.
const STORAGE_KEY = "rethread:favorites";

type Favorites = Record<string, Listing>;

const listeners = new Set<() => void>();

function load(): Favorites {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

let favorites = load();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  // Keep other open tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    favorites = load();
    listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function toggleFavorite(listing: Listing) {
  const next = { ...favorites };
  if (next[listing.id]) delete next[listing.id];
  else next[listing.id] = listing;
  favorites = next;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Storage unavailable (private mode) — favourites last for this visit only.
  }
  emit();
}

export function useFavorites() {
  return useSyncExternalStore(subscribe, () => favorites);
}

// Whether the saved-items drawer is open.
let drawerOpen = false;
const drawerListeners = new Set<() => void>();

export function setSavedOpen(open: boolean) {
  drawerOpen = open;
  drawerListeners.forEach((listener) => listener());
}

export function useSavedOpen() {
  return useSyncExternalStore(
    (listener) => {
      drawerListeners.add(listener);
      return () => drawerListeners.delete(listener);
    },
    () => drawerOpen
  );
}

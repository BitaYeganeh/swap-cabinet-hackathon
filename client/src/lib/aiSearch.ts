import { useSyncExternalStore } from "react";
import { savePickReasons } from "./aiPicks";
import { aiSearch } from "./api";
import { aiBrowseUrl } from "./search";

// One AI search at a time, shared by the search bar and the example chips, so
// whichever started it the search bar shows the progress.

// Need searches make two AI calls (understand, then pick), so allow ~30s.
const TIMEOUT_MS = 30_000;

let pending: string | null = null;
let controller: AbortController | null = null;
const listeners = new Set<() => void>();

function setPending(query: string | null) {
  pending = query;
  listeners.forEach((listener) => listener());
}

/**
 * Run an AI search and navigate to its results. If the AI fails or is too
 * slow, navigate to `fallbackUrl` (a plain keyword search) instead, so the
 * shopper always gets results.
 */
export async function runAiSearch(query: string, navigate: (url: string) => void, fallbackUrl: string) {
  cancelAiSearch();
  const current = new AbortController();
  controller = current;
  setPending(query);
  const timeout = setTimeout(() => current.abort(), TIMEOUT_MS);

  try {
    const result = await aiSearch(query, current.signal);
    if (controller !== current) return;
    if (result.picks?.length) savePickReasons(result.query, result.picks);
    navigate(aiBrowseUrl(result));
  } catch {
    if (controller === current) navigate(fallbackUrl);
  } finally {
    clearTimeout(timeout);
    if (controller === current) {
      controller = null;
      setPending(null);
    }
  }
}

/** Stop a running AI search without navigating anywhere. */
export function cancelAiSearch() {
  const running = controller;
  controller = null;
  running?.abort();
  if (pending !== null) setPending(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The query of the AI search in progress, or null. */
export function useAiSearchPending() {
  return useSyncExternalStore(subscribe, () => pending);
}

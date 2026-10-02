import type { SearchParams } from "./api";
import { CATEGORIES } from "./format";

// Everything lives in the query string of the single page: "/?category=kids&type=tops&…".
export const QUERY_KEYS = ["category", "keywords", "type", "gender", "size", "condition", "color", "brand", "minPrice", "maxPrice", "sort", "ids"] as const;

const isCategory = (value: string) => CATEGORIES.some((c) => c.value && c.value === value);

export function readSearch(searchParams: URLSearchParams): SearchParams {
  const params: SearchParams = {};
  QUERY_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) params[key] = value;
  });
  // Ignore unknown categories rather than showing an empty page.
  if (params.category && !isCategory(params.category)) delete params.category;
  const page = Number(searchParams.get("page"));
  if (page > 1) params.page = page;
  return params;
}

// With nothing searched the page shows only the hero; any category, search,
// filter or sort shows results instead.
export const isLanding = (search: SearchParams) => !search.page && QUERY_KEYS.every((key) => !search[key]);

// An AI search adds these to the URL: the shopper's own words, the AI's summary
// of what it searched for, any filters dropped to find matches, and for need
// searches the picked listing ids. They drive the banner above the results.
export const AI_KEYS = ["q", "ai", "relaxed", "nopicks", "ids"] as const;

/**
 * Build a URL for the page from the current query string plus changes.
 * Any change resets pagination unless `page` is part of the changes.
 */
export function browseUrl(current: URLSearchParams, changes: Partial<SearchParams> = {}) {
  const next = new URLSearchParams(current);
  if (!("page" in changes)) next.delete("page");
  // Any other change (a filter, a new search) closes the item popup.
  if (!("item" in changes)) next.delete("item");
  // Paging or re-sorting keeps the AI banner; changing any filter means the
  // shopper is refining by hand, so the AI summary no longer describes the results.
  if (Object.keys(changes).some((key) => key !== "page" && key !== "sort")) {
    AI_KEYS.forEach((key) => next.delete(key));
  }
  // Subcategories belong to a category, so switching category drops them.
  if ("category" in changes) {
    next.delete("type");
    next.delete("gender");
    next.delete("size");
  }

  Object.entries(changes).forEach(([key, value]) => {
    if (value === undefined || value === "" || (key === "page" && value === 1)) next.delete(key);
    else next.set(key, String(value));
  });

  const qs = next.toString();
  return qs ? `/?${qs}` : "/";
}

// Searches of two or more words go to the AI; single words ("jeans", "nike")
// stay on the instant keyword search.
export const shouldUseAi = (text: string) => text.trim().split(/\s+/).length >= 2;

export type AiResult = {
  query: string;
  filters: Partial<Record<keyof SearchParams, string>>;
  summary: string;
  dropped: string[];
  noPicks?: boolean;
};

// Browse URL for an AI search: a fresh search built only from the AI's filters.
export function aiBrowseUrl({ query, filters, summary, dropped, noPicks }: AiResult) {
  const next = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value && next.set(key, value));
  next.set("q", query);
  next.set("ai", summary);
  if (dropped.length) next.set("relaxed", dropped.join(","));
  if (noPicks) next.set("nopicks", "1");
  return `/?${next}`;
}

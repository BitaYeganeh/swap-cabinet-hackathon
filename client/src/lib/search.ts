import type { SearchParams } from "./api";
import { CATEGORIES } from "./format";

// Everything lives in the query string of the single page: "/?category=kids&type=tops&…".
export const QUERY_KEYS = ["category", "keywords", "type", "gender", "size", "condition", "color", "brand", "minPrice", "maxPrice", "sort"] as const;

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

// With nothing searched the page shows only the hero; any category, search or
// filter shows results instead.
export const isLanding = (search: SearchParams) =>
  !search.page && QUERY_KEYS.every((key) => key === "sort" || !search[key]);

/**
 * Build a URL for the page from the current query string plus changes.
 * Any change resets pagination unless `page` is part of the changes.
 */
export function browseUrl(current: URLSearchParams, changes: Partial<SearchParams> = {}) {
  const next = new URLSearchParams(current);
  if (!("page" in changes)) next.delete("page");
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

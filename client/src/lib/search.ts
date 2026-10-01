import type { SearchParams } from "./api";

// Filters kept in the query string. Category lives in the path: /category/:category
export const QUERY_KEYS = ["keywords", "type", "gender", "size", "condition", "color", "minPrice", "maxPrice", "sort"] as const;

export function readSearch(searchParams: URLSearchParams): SearchParams {
  const params: SearchParams = {};
  QUERY_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) params[key] = value;
  });
  const page = Number(searchParams.get("page"));
  if (page > 1) params.page = page;
  return params;
}

// An AI search adds these to the URL: the shopper's own words, the AI's summary
// of what it searched for, and any filters dropped to find matches. They drive
// the banner above the results.
export const AI_KEYS = ["q", "ai", "relaxed"] as const;

export const categoryPath = (category?: string) => (category ? `/category/${category}` : "/");

export const isBrowsePath = (pathname: string) =>
  pathname === "/" || pathname.startsWith("/category/");

/**
 * Build a browse URL from the current query string plus changes.
 * Any change resets pagination unless `page` is part of the changes.
 */
export function browseUrl(
  category: string | undefined,
  current: URLSearchParams,
  changes: Partial<SearchParams> = {}
) {
  const next = new URLSearchParams(current);
  if (!("page" in changes)) next.delete("page");
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
    if (key === "category") return;
    if (value === undefined || value === "" || (key === "page" && value === 1)) next.delete(key);
    else next.set(key, String(value));
  });

  const nextCategory = "category" in changes ? changes.category : category;
  const qs = next.toString();
  return `${categoryPath(nextCategory)}${qs ? `?${qs}` : ""}`;
}

// Searches of two or more words go to the AI; single words ("jeans", "nike")
// stay on the instant keyword search.
export const shouldUseAi = (text: string) => text.trim().split(/\s+/).length >= 2;

export type AiResult = {
  query: string;
  filters: Partial<Record<keyof SearchParams, string>>;
  summary: string;
  dropped: string[];
};

// Browse URL for an AI search: a fresh search built only from the AI's filters.
export function aiBrowseUrl({ query, filters, summary, dropped }: AiResult) {
  const { category, ...rest } = filters;
  const next = new URLSearchParams();
  Object.entries(rest).forEach(([key, value]) => value && next.set(key, value));
  next.set("q", query);
  next.set("ai", summary);
  if (dropped.length) next.set("relaxed", dropped.join(","));
  return `${categoryPath(category)}?${next}`;
}

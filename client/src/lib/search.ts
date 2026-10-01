import type { SearchParams } from "./api";

// Filters kept in the query string. Category lives in the path: /category/:category
export const QUERY_KEYS = ["keywords", "condition", "color", "brand", "minPrice", "maxPrice", "sort"] as const;

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

  Object.entries(changes).forEach(([key, value]) => {
    if (key === "category") return;
    if (value === undefined || value === "" || (key === "page" && value === 1)) next.delete(key);
    else next.set(key, String(value));
  });

  const nextCategory = "category" in changes ? changes.category : category;
  const qs = next.toString();
  return `${categoryPath(nextCategory)}${qs ? `?${qs}` : ""}`;
}

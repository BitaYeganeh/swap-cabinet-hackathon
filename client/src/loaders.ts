import type { LoaderFunctionArgs } from "react-router";
import { getBrands, getListings } from "./lib/api";
import { isLanding, readSearch } from "./lib/search";

// "/" — search results for the current query string (nothing to fetch for the hero).
export async function listingsLoader({ request }: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams;
  const search = readSearch(searchParams);
  // An AI search ("q") always shows results, even if the AI chose no filters.
  if (isLanding(search) && !searchParams.get("q")) {
    return {
      success: true,
      listings: [],
      pagination: { page: 1, totalPages: 0, totalItems: 0, perPage: 0 },
      suggestion: null,
      brands: [],
    };
  }

  const [results, brands] = await Promise.all([
    getListings(search, request.signal),
    getBrands(request.signal).catch(() => []),
  ]);
  return { ...results, brands };
}

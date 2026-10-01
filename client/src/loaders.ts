import type { LoaderFunctionArgs } from "react-router";
import { getBrands, getListings } from "./lib/api";
import { isLanding, readSearch } from "./lib/search";

// "/" — search results for the current query string (nothing to fetch for the hero).
export async function listingsLoader({ request }: LoaderFunctionArgs) {
  const search = readSearch(new URL(request.url).searchParams);
  if (isLanding(search)) {
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

import { data, type LoaderFunctionArgs } from "react-router";
import { ApiError, getBrands, getListing, getListings } from "./lib/api";
import { CATEGORIES } from "./lib/format";
import { readSearch } from "./lib/search";

// "/" and "/category/:category" — search results for the current URL.
export async function listingsLoader({ request, params }: LoaderFunctionArgs) {
  const { category } = params;

  if (category && !CATEGORIES.some((c) => c.value === category)) {
    throw data("Category not found", { status: 404 });
  }

  const search = readSearch(new URL(request.url).searchParams);
  const [results, brands] = await Promise.all([
    getListings({ ...search, category }, request.signal),
    getBrands(request.signal).catch(() => []),
  ]);
  return { ...results, brands };
}

// "/listings/:id" — one listing plus a few more from the same category.
export async function listingLoader({ request, params }: LoaderFunctionArgs) {
  try {
    const listing = await getListing(params.id!, request.signal);

    const related = listing.category
      ? await getListings({ category: listing.category }, request.signal)
          .then((res) => res.listings.filter((l) => l.id !== listing.id).slice(0, 4))
          .catch(() => [])
      : [];

    return { listing, related };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw data("Listing not found", { status: 404 });
    }
    throw error;
  }
}

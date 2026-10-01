const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type Money = {
  amount: number;
  currency: string;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  price: Money | null;
  listingType: string;
  category?: string;
  subcategory?: string;
  condition?: string;
  conditionDetails?: string;
  color?: string;
  size?: string;
  brand?: string;
  material?: string;
  careInstructions?: string;
  petFreeHome: boolean;
  smokeFreeHome: boolean;
  shippingEnabled: boolean;
  pickupEnabled: boolean;
  shippingPrice: number | null;
  address: string | null;
  city: string | null;
  sellerName: string | null;
  images: { url: string; url2x: string }[];
};

export type Pagination = {
  page: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
};

export type SearchParams = {
  keywords?: string;
  category?: string;
  condition?: string;
  color?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: number;
};

export type ListingsResponse = {
  success: boolean;
  listings: Listing[];
  pagination: Pagination;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { signal });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Make sure it is running on port 3000.", 0);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.message || "Something went wrong", response.status);
  }

  return response.json();
}

export function getListings(
  params: SearchParams = {},
  signal?: AbortSignal
): Promise<ListingsResponse> {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });

  return request(`/api/listings?${query}`, signal);
}

export type Brand = {
  name: string;
  count: number;
};

export async function getBrands(signal?: AbortSignal): Promise<Brand[]> {
  const body = await request<{ brands: Brand[] }>("/api/listings/brands", signal);
  return body.brands;
}

export async function getListing(id: string, signal?: AbortSignal): Promise<Listing> {
  const body = await request<{ listing: Listing }>(
    `/api/listings/${encodeURIComponent(id)}`,
    signal
  );
  return body.listing;
}

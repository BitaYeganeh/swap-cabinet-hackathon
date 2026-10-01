import { ApiError, type Listing } from "./api";

const API_URL = import.meta.env.VITE_API_URL || "";

export type PhotoLabels = {
  group: string;
  kind: string;
  brand: string | null;
  model: string | null;
  style: string | null;
  material: string | null;
  pattern: string | null;
  details: string[];
  color: string | null;
};

export type PhotoGroupKey = "same" | "exact" | "close" | "other" | "closest";

export type PhotoSearchResponse = {
  success: boolean;
  labels: PhotoLabels | null;
  /** Every item seen in the photo (main one first); `labels` is items[selected]. */
  items: PhotoLabels[];
  selected: number;
  /** Labelling failed: one list ordered by looks only. */
  fallback: boolean;
  noClothing: boolean;
  groups: { key: PhotoGroupKey; listings: Listing[] }[];
  /** "Looking for" requests for this kind of item. */
  wanted: Listing[];
};

export const PHOTO_TYPES = "image/jpeg,image/png,image/webp";

export const GROUP_TITLES: Record<PhotoGroupKey, string> = {
  same: "Same product",
  exact: "Exact matches",
  close: "Similar items",
  other: "Other items",
  closest: "Closest matches",
};

// `item` picks which item seen in the photo to search for (0 = the main one).
export async function photoSearch(file: File, item = 0, signal?: AbortSignal): Promise<PhotoSearchResponse> {
  const body = new FormData();
  body.append("item", String(item));
  body.append("photo", file);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/search/image`, { method: "POST", body, signal });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Make sure it is running on port 3000.", 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.message || "Photo search failed", response.status);
  return data;
}

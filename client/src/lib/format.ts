import type { Listing, Money } from "./api";

export const CATEGORIES = [
  { value: "", label: "All" },
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "kids", label: "Kids" },
];

// Subcategory types, stored as categoryLevel2 = "<category>-<type>".
export const TYPES = [
  { value: "tops", label: "Tops" },
  { value: "bottoms", label: "Bottoms" },
  { value: "shoes", label: "Shoes" },
  { value: "accessories", label: "Accessories" },
  { value: "bundles", label: "Bundles" },
];

// Only the kids category is split by gender.
export const GENDERS = [
  { value: "boys", label: "Boys" },
  { value: "girls", label: "Girls" },
];

export const genderLabel = (value?: string | null) => (value ? labelFor(GENDERS, value) : "");

export const CONDITIONS = [
  { value: "like-new", label: "Like new" },
  { value: "gently-used", label: "Gently used" },
  { value: "well-used", label: "Well used" },
  { value: "heavily-used", label: "Heavily used" },
];

export const COLORS = [
  { value: "black", label: "Black", swatch: "#1c1a17" },
  { value: "white", label: "White", swatch: "#ffffff" },
  { value: "blue", label: "Blue", swatch: "#3a5f9e" },
  { value: "green", label: "Green", swatch: "#4f7a4a" },
  { value: "brown", label: "Brown", swatch: "#7a5234" },
  { value: "bronze", label: "Bronze", swatch: "#a8733a" },
  {
    value: "multicolor",
    label: "Multi",
    swatch: "conic-gradient(#e0533d, #f2c14e, #4f9d69, #3a6ea5, #9b59b6, #e0533d)",
  },
];

export const SORTS = [
  { value: "", label: "Recommended" },
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export const WANTED_TYPE = "in-search-of-clothing";

export const isWanted = (listing: Listing) => listing.listingType === WANTED_TYPE;

export function formatMoney(money: Money | { amount: number; currency?: string }) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: money.currency || "EUR",
    minimumFractionDigits: money.amount % 100 === 0 ? 0 : 2,
  }).format(money.amount / 100);
}

export const labelFor = (list: { value: string; label: string }[], value?: string) =>
  list.find((item) => item.value === value)?.label ?? value ?? "";

export const conditionLabel = (value?: string) => labelFor(CONDITIONS, value);

export const categoryLabel = (value?: string) => labelFor(CATEGORIES, value);

// "women-shoes" -> "Shoes"
export function subcategoryLabel(value?: string) {
  if (!value) return "";
  const last = value.split("-").slice(1).join(" ") || value;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

// Split "…text. Photo by Name (https://…)" into description and photo credit.
export function splitPhotoCredit(description: string) {
  const match = description.match(/\s*Photo by (.+?)(?:\s*\((https?:\/\/[^)]+)\))?\s*$/);
  if (!match || match.index === undefined) return { text: description, credit: null };
  return {
    text: description.slice(0, match.index).trim(),
    credit: { name: match[1], url: match[2] ?? null },
  };
}

export function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

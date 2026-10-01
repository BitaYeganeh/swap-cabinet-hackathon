import { useSyncExternalStore } from "react";

export const SIZE_SYSTEMS = ["EU", "UK", "US"] as const;
export type SizeSystem = (typeof SIZE_SYSTEMS)[number];
type Conversion = Record<SizeSystem, string>;

// Listings store one of three kinds of size:
//   clothing: letter sizes ("s", "m", "xl")
//   shoes:    EU shoe sizes ("38", "27")
//   kids:     ages ("6m", "5y")
export type SizeKind = "letter" | "shoe" | "kids";

export const LETTER_SIZES = ["xs", "s", "m", "l", "xl", "xxl"];

// Approximate chart equivalents for each letter size.
const CLOTHING: Record<"women" | "men", Record<string, Conversion>> = {
  women: {
    xs: { EU: "34", UK: "6", US: "2" },
    s: { EU: "36", UK: "8", US: "4" },
    m: { EU: "38", UK: "10", US: "6" },
    l: { EU: "40", UK: "12", US: "8" },
    xl: { EU: "42", UK: "14", US: "10" },
    xxl: { EU: "44", UK: "16", US: "12" },
  },
  men: {
    xs: { EU: "44", UK: "34", US: "34" },
    s: { EU: "46", UK: "36", US: "36" },
    m: { EU: "48", UK: "38", US: "38" },
    l: { EU: "50", UK: "40", US: "40" },
    xl: { EU: "52", UK: "42", US: "42" },
    xxl: { EU: "54", UK: "44", US: "44" },
  },
};

// Kids' clothing: EU sizes by height in cm, UK by age range, US by age / toddler size.
export const KIDS_AGES: { value: string; label: string; size: Conversion }[] = [
  { value: "3m", label: "3 months", size: { EU: "62", UK: "0–3 months", US: "0–3M" } },
  { value: "6m", label: "6 months", size: { EU: "68", UK: "3–6 months", US: "3–6M" } },
  { value: "9m", label: "9 months", size: { EU: "74", UK: "6–9 months", US: "6–9M" } },
  { value: "12m", label: "12 months", size: { EU: "80", UK: "9–12 months", US: "12M" } },
  { value: "18m", label: "18 months", size: { EU: "86", UK: "12–18 months", US: "18M" } },
  { value: "2y", label: "2 years", size: { EU: "92", UK: "18–24 months", US: "2T" } },
  { value: "3y", label: "3 years", size: { EU: "98", UK: "2–3 years", US: "3T" } },
  { value: "4y", label: "4 years", size: { EU: "104", UK: "3–4 years", US: "4T" } },
  { value: "5y", label: "5 years", size: { EU: "110", UK: "4–5 years", US: "5" } },
  { value: "6y", label: "6 years", size: { EU: "116", UK: "5–6 years", US: "6" } },
  { value: "7y", label: "7 years", size: { EU: "122", UK: "6–7 years", US: "7" } },
  { value: "8y", label: "8 years", size: { EU: "128", UK: "7–8 years", US: "8" } },
  { value: "9y", label: "9 years", size: { EU: "134", UK: "8–9 years", US: "10" } },
  { value: "10y", label: "10 years", size: { EU: "140", UK: "9–10 years", US: "10" } },
  { value: "11y", label: "11 years", size: { EU: "146", UK: "10–11 years", US: "12" } },
  { value: "12y", label: "12 years", size: { EU: "152", UK: "11–12 years", US: "12" } },
  { value: "13y", label: "13 years", size: { EU: "158", UK: "12–13 years", US: "14" } },
  { value: "14y", label: "14 years", size: { EU: "164", UK: "13–14 years", US: "14" } },
];

// Kids' shoes don't follow a simple formula, so use a chart. EU -> [UK, US]
const KIDS_SHOES: Record<string, [string, string]> = {
  "18": ["2", "3"],
  "19": ["3", "4"],
  "20": ["4", "5"],
  "21": ["5", "5.5"],
  "22": ["5.5", "6.5"],
  "23": ["6", "7.5"],
  "24": ["7", "8"],
  "25": ["8", "9"],
  "26": ["8.5", "9.5"],
  "27": ["9", "10"],
  "28": ["10", "11"],
  "29": ["11", "12"],
  "30": ["11.5", "12.5"],
  "31": ["12.5", "13"],
  "32": ["13", "1"],
  "33": ["1", "2"],
  "34": ["2", "3"],
  "35": ["2.5", "3.5"],
};

export const ADULT_SHOE_SIZES = Array.from({ length: 13 }, (_, i) => String(35 + i)); // 35–47
export const KIDS_SHOE_SIZES = Object.keys(KIDS_SHOES);

const half = (n: number) => String(Math.round(n * 2) / 2);

function shoeConversion(eu: string, category?: string): Conversion | null {
  if (category === "kids") {
    const row = KIDS_SHOES[eu];
    return row ? { EU: eu, UK: row[0], US: row[1] } : null;
  }
  const n = Number(eu);
  if (!n) return null;
  // Common rules of thumb: women UK = EU − 33, US = UK + 2.5; men UK = EU − 34, US = UK + 1.
  return category === "men"
    ? { EU: eu, UK: half(n - 34), US: half(n - 33) }
    : { EU: eu, UK: half(n - 33), US: half(n - 30.5) };
}

export function sizeKind(size: string): SizeKind | null {
  if (/^\d+(\.\d+)?$/.test(size)) return "shoe";
  if (/^\d+[my]$/.test(size)) return "kids";
  if (LETTER_SIZES.includes(size)) return "letter";
  return null;
}

export type SizeInfo = {
  kind: SizeKind;
  /** The size as the seller entered it: "M", "38", "5 years". */
  label: string;
  /** EU / UK / US equivalents, when known. */
  conversion: Conversion | null;
};

export function sizeInfo(size: string | undefined, category?: string): SizeInfo | null {
  if (!size) return null;
  const value = size.toLowerCase();
  const kind = sizeKind(value);

  if (kind === "letter") {
    const chart = category === "men" || category === "women" ? CLOTHING[category] : null;
    return { kind, label: value.toUpperCase(), conversion: chart?.[value] ?? null };
  }
  if (kind === "shoe") {
    return { kind, label: value, conversion: shoeConversion(value, category) };
  }
  if (kind === "kids") {
    const age = KIDS_AGES.find((a) => a.value === value);
    return { kind, label: age?.label ?? value, conversion: age?.size ?? null };
  }
  return { kind: "letter", label: size.toUpperCase(), conversion: null };
}

/** Short size text for cards and chips, in the viewer's chosen system. */
export function formatSize(size: string | undefined, category: string | undefined, system: SizeSystem) {
  const info = sizeInfo(size, category);
  if (!info) return "";
  const converted = info.conversion?.[system];

  if (info.kind === "letter") return converted ? `${info.label} · ${system} ${converted}` : info.label;
  if (info.kind === "shoe") return converted ? `${system} ${converted}` : `EU ${info.label}`;
  // Kids' EU sizes are heights in cm.
  if (!converted) return info.label;
  return system === "EU" ? `EU ${converted} cm` : `${system} ${converted}`;
}

// Filter values are "m" (clothing), "shoe-38" (shoes) or "kids-5y" (kids clothing).
export function sizeFilterLabel(value: string, category: string | undefined, system: SizeSystem) {
  if (value.startsWith("shoe-")) return `Shoe ${formatSize(value.slice(5), category, system)}`;
  if (value.startsWith("kids-")) return formatSize(value.slice(5), "kids", system);
  return formatSize(value, category, system);
}

// --- Viewer's preferred size system, remembered in localStorage. ---

const STORAGE_KEY = "rethread:size-system";
const listeners = new Set<() => void>();

function loadSystem(): SizeSystem {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SIZE_SYSTEMS.includes(saved as SizeSystem) ? (saved as SizeSystem) : "EU";
  } catch {
    return "EU";
  }
}

let system = loadSystem();

export function setSizeSystem(next: SizeSystem) {
  system = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage unavailable — the choice lasts for this visit only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSizeSystem() {
  return useSyncExternalStore(subscribe, () => system);
}

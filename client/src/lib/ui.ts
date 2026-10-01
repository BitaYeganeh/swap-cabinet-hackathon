export const BRAND = "Rethread";

// Shared Tailwind class strings for buttons used across pages.
const btnBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border font-semibold no-underline transition active:scale-[0.98] disabled:opacity-50";

export const btn = {
  primary: `${btnBase} h-11 px-5 border-transparent bg-accent text-white hover:bg-accent-hover`,
  warm: `${btnBase} h-11 px-5 border-transparent bg-warm text-white hover:brightness-95`,
  dark: `${btnBase} h-10 px-4 border-transparent bg-ink text-white hover:bg-black`,
  ghost: `${btnBase} h-11 px-5 border-line bg-surface text-ink hover:border-ink-3`,
  ghostSmall: `${btnBase} h-9 px-3.5 text-sm border-line bg-surface text-ink hover:border-ink-3`,
  link: "text-sm text-ink-2 underline underline-offset-[3px] hover:text-ink",
};

export const countBadge =
  "min-w-[18px] h-[18px] px-[5px] rounded-full bg-warm text-white text-[11px] font-bold leading-[18px] text-center";

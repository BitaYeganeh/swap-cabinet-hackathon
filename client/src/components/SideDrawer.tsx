import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import { countBadge } from "../lib/ui";

type Props = {
  title: ReactNode;
  label: string;
  onClose: () => void;
  children: ReactNode;
};

// Panel sliding in from the right over a dimmed page (basket, saved items).
// Escape or a click outside closes it; the page behind doesn't scroll.
export default function SideDrawer({ title, label, onClose, children }: Props) {
  useEffect(() => {
    // Captured and stopped here, so Escape closes only the drawer and not an
    // item popup open underneath it.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-80">
      <div className="absolute inset-0 animate-fade-in bg-black/45" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="absolute inset-y-0 right-0 flex w-[min(420px,100vw)] animate-slide-in-right flex-col bg-bg shadow-float"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-hero text-xl font-extrabold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${label.toLowerCase()}`}
            className="grid size-9 place-items-center rounded-full hover:bg-surface-2"
          >
            <LuX className="size-5" />
          </button>
        </header>
        {children}
      </aside>
    </div>,
    document.body
  );
}

// Icon-only button in the header's right slot (label for screen readers), with a count badge.
export function HeaderButton({
  icon,
  label,
  count,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} (${count} ${count === 1 ? "item" : "items"})`}
      className="relative grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2 [&>svg]:size-6 [&>svg]:stroke-[1.75]"
    >
      {icon}
      {count > 0 && <span className={`${countBadge} absolute top-0 right-0`}>{count}</span>}
    </button>
  );
}

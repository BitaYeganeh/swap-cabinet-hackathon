import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import type { Pagination as PaginationData } from "../lib/api";

const pageBtn =
  "grid h-[42px] min-w-[42px] place-items-center rounded-full border px-2 font-semibold transition disabled:opacity-35";

export default function Pagination({
  pagination,
  onPage,
}: {
  pagination: PaginationData;
  onPage: (page: number) => void;
}) {
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-12 flex justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        className={`${pageBtn} border-line bg-surface hover:enabled:border-ink`}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
      >
        <LuChevronLeft className="size-5" />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          type="button"
          key={p}
          onClick={() => onPage(p)}
          aria-current={p === page ? "page" : undefined}
          className={`${pageBtn} ${
            p === page ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        className={`${pageBtn} border-line bg-surface hover:enabled:border-ink`}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        <LuChevronRight className="size-5" />
      </button>
    </nav>
  );
}

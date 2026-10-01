import { LuSearchX, LuTriangleAlert } from "react-icons/lu";
import { Link, isRouteErrorResponse, useRevalidator, useRouteError } from "react-router";
import EmptyState from "../components/EmptyState";
import { BRAND, btn } from "../lib/ui";

export function NotFoundPage({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <title>{`Not found · ${BRAND}`}</title>
      <EmptyState
        icon={<LuSearchX />}
        title="Nothing here"
        action={
          <Link to="/" className={btn.primary}>
            Back to shop
          </Link>
        }
      >
        {message}
      </EmptyState>
    </div>
  );
}

// Rendered inside the root layout when a page's loader or render fails.
export default function ErrorPage() {
  const error = useRouteError();
  const revalidator = useRevalidator();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage message={typeof error.data === "string" ? `${error.data}.` : undefined} />;
  }

  const message = error instanceof Error ? error.message : "Something went wrong.";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <title>{`Error · ${BRAND}`}</title>
      <EmptyState
        icon={<LuTriangleAlert />}
        title="Something went wrong"
        action={
          <button
            type="button"
            className={btn.primary}
            disabled={revalidator.state === "loading"}
            onClick={() => revalidator.revalidate()}
          >
            {revalidator.state === "loading" ? "Retrying…" : "Try again"}
          </button>
        }
      >
        {message}
      </EmptyState>
    </div>
  );
}

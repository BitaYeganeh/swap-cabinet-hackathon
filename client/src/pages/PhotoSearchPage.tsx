import { useEffect, useMemo, useState } from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { useLocation } from "react-router";
import ListingCard, { ListingGrid } from "../components/ListingCard";
import PhotoSearchButton from "../components/PhotoSearchButton";
import { GROUP_TITLES, photoSearch, type PhotoLabels, type PhotoSearchResponse } from "../lib/photoSearch";
import { BRAND } from "../lib/ui";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: PhotoSearchResponse }
  | { status: "error"; message: string };

function describe(labels: PhotoLabels) {
  const brand = [labels.brand, labels.model].filter(Boolean).join(" ");
  return [brand, labels.kind].filter(Boolean).join(" ");
}

export default function PhotoSearchPage() {
  const file = (useLocation().state as { file?: File } | null)?.file;
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [state, setState] = useState<State>({ status: file ? "loading" : "idle" });

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    photoSearch(file, controller.signal)
      .then((result) => setState({ status: "done", result }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ status: "error", message: error.message });
      });
    return () => controller.abort();
  }, [file]);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 pb-16 sm:px-6 sm:pt-8">
      <title>{`Photo search · ${BRAND}`}</title>

      <div className="mb-6 flex items-center gap-4">
        {preview ? (
          <img src={preview} alt="Your photo" className="size-20 rounded-xl border border-line object-cover" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl leading-tight font-medium tracking-tight sm:text-3xl">Photo search</h2>
          <p className="mt-1 text-sm text-ink-3">
            {state.status === "idle" && "Take or upload a photo of an item you like."}
            {state.status === "loading" && "Looking at your photo…"}
            {state.status === "error" && state.message}
            {state.status === "done" && state.result.labels && <>We see: <strong className="text-ink">{describe(state.result.labels)}</strong></>}
            {state.status === "done" && state.result.fallback && "Showing the items that look most alike."}
            {state.status === "done" && state.result.noClothing && "We can't see a clothing item in this photo. Try another photo."}
          </p>
        </div>
        <PhotoSearchButton className="border border-line" />
      </div>

      {state.status === "loading" && (
        <div className="grid place-items-center py-16 text-ink-3">
          <LuLoaderCircle className="size-8 animate-spin" />
        </div>
      )}

      {state.status === "done" && (
        <div className="space-y-10">
          {state.result.groups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-3 text-lg font-semibold">
                {GROUP_TITLES[group.key]} <span className="font-normal text-ink-3">({group.listings.length})</span>
              </h3>
              <ListingGrid>
                {group.listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </ListingGrid>
            </section>
          ))}

          {state.result.wanted.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface-2 p-4">
              <h3 className="mb-3 text-lg font-semibold">People also look for this</h3>
              <ListingGrid>
                {state.result.wanted.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </ListingGrid>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

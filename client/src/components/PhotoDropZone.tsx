import { useEffect, useRef, useState } from "react";
import { LuImagePlus } from "react-icons/lu";
import { useNavigate } from "react-router";
import { PHOTO_TYPES } from "../lib/photoSearch";

const ACCEPTED = PHOTO_TYPES.split(",");
const ERROR_MS = 3000;

const carriesFiles = (event: DragEvent) => !!event.dataTransfer?.types.includes("Files");

// Drop a photo anywhere on any page to search with it, same as the camera button.
export default function PhotoDropZone() {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // dragenter/dragleave fire for every child element; count them so the
  // overlay only hides when the drag really leaves the window.
  const depth = useRef(0);
  const errorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const showError = (message: string) => {
      clearTimeout(errorTimer.current);
      setError(message);
      errorTimer.current = setTimeout(() => setError(null), ERROR_MS);
    };

    const onEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth.current += 1;
      setDragging(true);
    };
    const onOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault(); // allows the drop
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault(); // stops the browser from opening the file
      depth.current = 0;
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) return showError("Use a JPG, PNG or WEBP photo");
      navigate("/photo", { state: { file } });
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      clearTimeout(errorTimer.current);
    };
  }, [navigate]);

  return (
    <>
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-accent bg-surface px-8 py-10 text-center shadow-float">
            <LuImagePlus className="size-10 text-accent" />
            <p className="text-lg font-semibold text-ink">Drop your photo to find similar items</p>
            <p className="text-sm text-ink-3">JPG, PNG or WEBP</p>
          </div>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-float"
        >
          {error}
        </div>
      )}
    </>
  );
}

import { useRef } from "react";
import { LuCamera } from "react-icons/lu";
import { useNavigate } from "react-router";
import { PHOTO_TYPES } from "../lib/photoSearch";

// Phones offer "take photo" or "choose from library"; computers open a file
// picker. No `capture` attribute: it would force the camera and hide uploads.
// Then goes to the photo results page with the chosen file.
export default function PhotoSearchButton({ className = "" }: { className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label="Search with a photo"
        title="Search with a photo"
        className={`grid size-[42px] shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink ${className}`}
      >
        <LuCamera className="size-5" />
      </button>
      <input
        ref={input}
        type="file"
        accept={PHOTO_TYPES}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // picking the same photo again still triggers a search
          if (file) navigate("/photo", { state: { file } });
        }}
      />
    </>
  );
}

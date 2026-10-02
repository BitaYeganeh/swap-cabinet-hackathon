import { useEffect, useState } from "react";

// Example searches that show off the AI: a plain request, a need, and filters in words.
export const AI_EXAMPLES = [
  "Shoes for kids",
  "Something to keep me dry in the rain",
  "Warm clothes for my son this winter",
  "Outfit for a job interview",
];

const TYPE_MS = 60;
const DELETE_MS = 30;
const HOLD_MS = 1800;

// Types each example out, holds it, deletes it, then moves to the next — for the
// search box placeholder. Returns null while paused or when motion is reduced.
export function useTypedExample(enabled: boolean) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let index = 0;
    let length = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const full = AI_EXAMPLES[index];
      let delay = deleting ? DELETE_MS : TYPE_MS;

      if (!deleting && ++length === full.length) {
        deleting = true;
        delay = HOLD_MS;
      } else if (deleting && --length === 0) {
        deleting = false;
        index = (index + 1) % AI_EXAMPLES.length;
      }

      setTyped(full.slice(0, length));
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, [enabled]);

  return enabled && typed ? `Try “${typed}”` : null;
}

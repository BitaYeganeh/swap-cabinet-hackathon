import { useEffect, useState } from 'react';

// Example searches that show off the AI: a plain request, a need, and filters in words.
export const AI_EXAMPLES = [
  'Shoes for kids',
  'Something to keep me dry in the rain',
  'Warm clothes for my son this winter',
  'Outfit for a job interview',
];

export const START_MS = 800;
export const TYPE_MS = 60;
export const DELETE_MS = 30;
export const HOLD_MS = 1800;

export const INITIAL_STEP = { index: 0, length: 0, deleting: false };

/**
 * One tick of the typing animation: type a letter, or (once the example is
 * complete) hold it and then delete it letter by letter, then move on to the
 * next example. Pure, so it can be tested without timers.
 *
 * @param {{ index: number, length: number, deleting: boolean }} step
 * @param {string[]} examples
 * @returns {{ step: Object, text: string, delay: number }} the next step, the
 * text to show now and how long to wait before the next tick
 */
export const nextStep = (step, examples = AI_EXAMPLES) => {
  const { index } = step;
  const full = examples[index];
  let { length, deleting } = step;
  let delay = deleting ? DELETE_MS : TYPE_MS;
  let nextIndex = index;

  if (!deleting && ++length >= full.length) {
    length = full.length;
    deleting = true;
    delay = HOLD_MS;
  } else if (deleting && --length <= 0) {
    length = 0;
    deleting = false;
    nextIndex = (index + 1) % examples.length;
  }

  return {
    step: { index: nextIndex, length, deleting },
    text: full.slice(0, length),
    delay,
  };
};

export const examplePlaceholder = text => `Try “${text}”`;

// Read after mount only, so the server-rendered page always matches.
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Types each example out, holds it, deletes it, then moves to the next — for the
 * search box placeholder. Starts only after mount and only while `enabled`
 * (the box is empty and not focused); timers are cleared when it pauses or the
 * component unmounts.
 *
 * @param {boolean} enabled
 * @returns {{ typed: string|null, reduced: boolean }} `typed` is the placeholder
 * to show now (null: show the normal one); `reduced` is true when the visitor
 * asked for less motion, so the caller shows a static example instead.
 */
export const useTypedExample = enabled => {
  const [typed, setTyped] = useState('');
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (!enabled || reduced) return undefined;
    let step = INITIAL_STEP;
    let timer;
    setTyped('');

    const tick = () => {
      const next = nextStep(step);
      step = next.step;
      setTyped(next.text);
      timer = setTimeout(tick, next.delay);
    };

    timer = setTimeout(tick, START_MS);
    return () => clearTimeout(timer);
  }, [enabled, reduced]);

  return { typed: enabled && !reduced && typed ? examplePlaceholder(typed) : null, reduced };
};

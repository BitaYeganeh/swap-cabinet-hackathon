import {
  DELETE_MS,
  HOLD_MS,
  INITIAL_STEP,
  TYPE_MS,
  examplePlaceholder,
  nextStep,
} from './aiExamples';

const run = (examples, ticks) => {
  let step = INITIAL_STEP;
  const out = [];
  for (let i = 0; i < ticks; i++) {
    const next = nextStep(step, examples);
    step = next.step;
    out.push([next.text, next.delay]);
  }
  return out;
};

describe('nextStep', () => {
  it('types an example, holds it, deletes it, then moves to the next', () => {
    expect(run(['ab', 'c'], 8)).toEqual([
      ['a', TYPE_MS],
      ['ab', HOLD_MS],
      ['a', DELETE_MS],
      ['', DELETE_MS],
      ['c', HOLD_MS],
      ['', DELETE_MS],
      ['a', TYPE_MS],
      ['ab', HOLD_MS],
    ]);
  });

  it('does not change the step it is given', () => {
    const step = { index: 0, length: 1, deleting: false };
    nextStep(step, ['abc']);
    expect(step).toEqual({ index: 0, length: 1, deleting: false });
  });

  it('wraps a one-letter example straight into holding', () => {
    expect(nextStep(INITIAL_STEP, ['x'])).toEqual({
      step: { index: 0, length: 1, deleting: true },
      text: 'x',
      delay: HOLD_MS,
    });
  });
});

describe('examplePlaceholder', () => {
  it('wraps the typed text in a hint', () => {
    expect(examplePlaceholder('Shoes')).toBe('Try “Shoes”');
  });
});

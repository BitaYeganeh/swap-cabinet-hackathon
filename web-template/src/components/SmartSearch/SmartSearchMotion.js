import React, { useEffect, useRef } from 'react';

import './SmartSearchMotion.module.css';

const ms = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
};

/**
 * A status line that shimmers while a state holds, then swaps to the next
 * state (transitions.dev "thinking states"). Cycles while mounted.
 *
 * @component
 * @param {Object} props
 * @param {Array<string>} props.states status lines, shown in order and then repeated
 * @returns {JSX.Element}
 */
export const ThinkingStatus = props => {
  const { states } = props;
  const boxRef = useRef(null);
  const longest = states.reduce((a, b) => (b.length > a.length ? b : a), '');

  useEffect(() => {
    const box = boxRef.current;
    if (!box || states.length < 2) return undefined;

    let live = box.querySelector('.t-think-text');
    let i = 0;
    const timers = [];
    const later = (fn, delay) => timers.push(setTimeout(fn, delay));

    const cycle = () => {
      later(() => {
        const swap = ms('--think-swap', 150);
        const gap = ms('--think-gap', 50);
        const leaving = live;
        i = (i + 1) % states.length;

        leaving.classList.add('is-exit');

        const next = document.createElement('span');
        next.className = 't-think-text is-enter-start';
        next.textContent = states[i];
        next.setAttribute('data-text', states[i]);
        box.appendChild(next);
        live = next;

        const release = () => {
          void next.offsetWidth; // flush the enter-start rest state
          next.classList.remove('is-enter-start');
        };
        if (gap > 0) later(release, gap);
        else release();

        later(() => {
          leaving.remove();
          cycle();
        }, swap + gap);
      }, ms('--think-hold', 2000));
    };
    cycle();

    return () => timers.forEach(clearTimeout);
  }, [states]);

  return (
    <span ref={boxRef} className="t-think" role="status">
      <span className="t-think-sizer" aria-hidden="true">
        {longest}
      </span>
      <span className="t-think-text" data-text={states[0]}>
        {states[0]}
      </span>
    </span>
  );
};

// Delay tables for the matrix loader variants.
const RING = [1, 2, 7, 11, 14, 13, 8, 4];
const INNER = [5, 6, 9, 10];
const TWINKLE = [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4];
const CYCLE = 1200; // keep in sync with --matrix-cycle

const dotStyle = (variant, idx) => {
  const col = idx % 4;
  if (variant === 'scan') return { '--d': Math.round(col * (CYCLE / 10)) };
  if (variant === 'twinkle') return { '--d': Math.round(TWINKLE[idx] * (CYCLE / 16)) };
  if (variant === 'orbit') {
    const k = RING.indexOf(idx);
    return k === -1 ? { animation: 'none' } : { '--d': Math.round(k * (CYCLE / 8)) };
  }
  const ring = INNER.includes(idx) ? 0 : 1;
  return { '--d': Math.round(ring * (CYCLE * 0.16)) };
};

/**
 * A tiny 4×4 dot loader (transitions.dev "matrix dot loader").
 *
 * @component
 * @param {Object} props
 * @param {'scan'|'twinkle'|'orbit'|'pulse'} props.variant
 * @param {string?} props.className
 * @returns {JSX.Element}
 */
export const MatrixLoader = props => {
  const { variant = 'scan', className } = props;
  return (
    <span className={className ? `t-matrix ${className}` : 't-matrix'} aria-hidden="true">
      {Array.from({ length: 16 }, (_, idx) => (
        <i key={idx} style={dotStyle(variant, idx)} />
      ))}
    </span>
  );
};

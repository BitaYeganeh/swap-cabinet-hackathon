// Which search the one box runs: two or more words go to the AI search, a
// single word (or a word and stray spaces) goes straight to the keyword search.
export const shouldUseAi = text =>
  String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length >= 2;

// The AI search makes up to two Claude calls (understand, then pick): allow ~30 s.
export const AI_TIMEOUT_MS = 30000;

export const TIMEOUT_NOTE = 'AI search took too long, so here are keyword results.';

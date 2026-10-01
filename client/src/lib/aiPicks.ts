// Why the AI picked each listing, kept per search for this browser tab. The URL
// carries only the picked ids, so a shared link shows the picks without reasons.
const key = (query: string) => `rethread:ai-picks:${query.trim().toLowerCase()}`;

export function savePickReasons(query: string, picks: { id: string; reason: string }[]) {
  try {
    sessionStorage.setItem(key(query), JSON.stringify(Object.fromEntries(picks.map((p) => [p.id, p.reason]))));
  } catch {
    // Storage unavailable — picks still show, just without reasons.
  }
}

export function readPickReasons(query: string | null): Record<string, string> {
  if (!query) return {};
  try {
    return JSON.parse(sessionStorage.getItem(key(query)) || "{}");
  } catch {
    return {};
  }
}

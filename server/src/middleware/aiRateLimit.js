// Per-IP limit on AI searches, so one visitor (or a script) can't burn through
// the daily AI budget for everyone. In memory, which is fine for one server.

const LIMIT = Number(process.env.AI_SEARCHES_PER_MINUTE) || 10;
const WINDOW_MS = 60_000;

// ip -> timestamps of recent requests, oldest first
const hits = new Map();

function recentHits(ip, now) {
  const times = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length) hits.set(ip, times);
  else hits.delete(ip);
  return times;
}

function aiRateLimit(req, res, next) {
  const now = Date.now();
  const times = recentHits(req.ip, now);

  if (times.length >= LIMIT) {
    const retryAfter = Math.ceil((times[0] + WINDOW_MS - now) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      success: false,
      message: "Too many AI searches, try again in a minute",
    });
  }

  times.push(now);
  hits.set(req.ip, times);
  next();
}

// Forget visitors who have gone quiet, so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const ip of hits.keys()) recentHits(ip, now);
}, WINDOW_MS).unref();

module.exports = { aiRateLimit };

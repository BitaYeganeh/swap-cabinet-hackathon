const express = require("express");
const Anthropic = require("@anthropic-ai/sdk").default;
const { interpretSearch, AiSearchError, aiStats } = require("../services/aiSearchService");
const { aiRateLimit } = require("../middleware/aiRateLimit");

const router = express.Router();

// POST /api/search/ai  { "query": "shoes for kids" }
// -> { success, filters: { category: "kids", type: "shoes" }, summary, isNeed }
router.post("/ai", aiRateLimit, async (req, res) => {
  try {
    const result = await interpretSearch(req.body?.query);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof AiSearchError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    // The client falls back to a plain keyword search on any of these.
    if (error instanceof Anthropic.RateLimitError) {
      console.error("AI search rate limited:", error.message);
      return res.status(429).json({ success: false, message: "AI search is busy, try again shortly" });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("AI search API error:", error.status, error.message);
      return res.status(502).json({ success: false, message: "AI search is unavailable" });
    }

    console.error("AI search failed:", error);
    res.status(500).json({ success: false, message: "AI search failed" });
  }
});

// GET /api/search/ai/stats -> today's AI searches, tokens and estimated spend
router.get("/ai/stats", (req, res) => {
  res.json({ success: true, ...aiStats() });
});

module.exports = router;

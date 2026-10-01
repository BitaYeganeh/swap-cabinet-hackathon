const express = require("express");
const { getListings, getListing, getAutocomplete } = require("../services/listingService");

const router = express.Router();

function logSharetribeError(error) {
  console.error(
    "Sharetribe error:",
    error.status,
    error.statusText,
    JSON.stringify(error.data?.errors ?? error.message, null, 2)
  );
}

// GET /api/listings?keywords=&category=&type=&gender=&size=&condition=&color=&minPrice=&maxPrice=&sort=&page=
router.get("/", async (req, res) => {
  try {
    const { listings, pagination, suggestion } = await getListings(req.query);

    res.json({
      success: true,
      listings,
      pagination,
      suggestion: suggestion ?? null,
    });
  } catch (error) {
    logSharetribeError(error);

    res.status(error.status === 400 ? 400 : 500).json({
      success: false,
      message:
        error.status === 400
          ? "Invalid search filters"
          : "Failed to fetch listings",
    });
  }
});

// GET /api/listings/autocomplete?q=&category=
// Declared before /:id so "autocomplete" isn't taken for a listing id.
router.get("/autocomplete", async (req, res) => {
  try {
    const { items, places } = await getAutocomplete(req.query);
    res.json({ success: true, items, places });
  } catch (error) {
    logSharetribeError(error);
    res.status(500).json({ success: false, message: "Failed to fetch suggestions" });
  }
});

// GET /api/listings/:id
router.get("/:id", async (req, res) => {
  try {
    const listing = await getListing(req.params.id);

    res.json({
      success: true,
      listing,
    });
  } catch (error) {
    // Sharetribe answers 400 for a malformed id and 404 for an unknown one.
    if (error.status === 400 || error.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    logSharetribeError(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch listing",
    });
  }
});

module.exports = router;

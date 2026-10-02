const express = require("express");
const { getFacets, getListings, getListing, getAutocomplete, getBrands } = require("../services/listingService");

const router = express.Router();

function logSharetribeError(error) {
  console.error(
    "Sharetribe error:",
    error.status,
    error.statusText,
    JSON.stringify(error.data?.errors ?? error.message, null, 2)
  );
}

// GET /api/listings/brands — brands available for the brand filter.
// Must stay above "/:id" so "brands" isn't treated as a listing id.
// GET /api/listings/facets?<same filters as /api/listings> — option counts for the
// filter dropdowns. Must stay above "/:id" so "facets" isn't treated as a listing id.
router.get("/facets", async (req, res) => {
  try {
    res.json({ success: true, facets: await getFacets(req.query) });
  } catch (error) {
    logSharetribeError(error);
    res.status(500).json({ success: false, message: "Failed to count filter options" });
  }
});

router.get("/brands", async (req, res) => {
  try {
    const brands = await getBrands();

    res.json({
      success: true,
      brands,
    });
  } catch (error) {
    logSharetribeError(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch brands",
    });
  }
});

// GET /api/listings?keywords=&category=&type=&gender=&size=&condition=&color=&brand=&minPrice=&maxPrice=&sort=&page=&ids=
router.get("/", async (req, res) => {
  try {
    const { listings, pagination, suggestion, similarOnly } = await getListings(req.query);

    res.json({
      success: true,
      listings,
      pagination,
      suggestion: suggestion ?? null,
      similarOnly: !!similarOnly,
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
    const { items, places, suggestion } = await getAutocomplete(req.query);
    res.json({ success: true, items, places, suggestion });
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

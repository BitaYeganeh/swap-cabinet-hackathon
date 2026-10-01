const express = require("express");
const { getListings, getListing } = require("../services/listingService");

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
    const { listings, pagination } = await getListings(req.query);

    res.json({
      success: true,
      listings,
      pagination,
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

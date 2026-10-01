const express = require("express");
const multer = require("multer");
const { searchByPhoto, ImageSearchError } = require("../services/imageSearchService");
const { aiRateLimit } = require("../middleware/aiRateLimit");

const router = express.Router();

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, done) =>
    TYPES.includes(file.mimetype) ? done(null, true) : done(new ImageSearchError("Use a JPG, PNG or WEBP photo", 400)),
});

// POST /api/search/image  (multipart/form-data, field "photo")
router.post(
  "/",
  aiRateLimit,
  (req, res, next) =>
    upload.single("photo")(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "The photo is too big (max 5 MB)" });
      }
      const status = error instanceof ImageSearchError ? error.status : 400;
      res.status(status).json({ success: false, message: error.message });
    }),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "Add a photo to search with" });
    try {
      res.json({ success: true, ...(await searchByPhoto(req.file.buffer, req.file.mimetype)) });
    } catch (error) {
      if (error instanceof ImageSearchError) return res.status(error.status).json({ success: false, message: error.message });
      console.error("Photo search failed:", error);
      res.status(500).json({ success: false, message: "Photo search failed" });
    }
  }
);

module.exports = router;

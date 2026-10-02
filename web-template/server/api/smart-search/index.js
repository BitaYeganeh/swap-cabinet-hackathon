/**
 * Smart Search module: AI search and photo search for the Sharetribe Web Template.
 *
 * Mounted in server/apiRouter.js as router.use('/smart-search', smartSearch).
 * Both endpoints answer with a normal search page URL, so results show on the
 * template's own SearchPage with its own listing cards.
 *
 *   POST /api/smart-search/ai     { "query": "a warm coat for my 5 year old" }
 *   POST /api/smart-search/photo  multipart/form-data, field "photo", optional "item"
 *   GET  /api/smart-search/keywords?q=jakcet  typo-tolerant keyword search -> ranked listing ids
 *   GET  /api/smart-search/autocomplete?q=jak  suggestions while typing (items, places, spelling)
 *   GET  /api/smart-search/stats  today's AI calls and estimated spend
 */

const express = require('express');
const multer = require('multer');
const { interpretSearch, AiSearchError } = require('./ai-search');
const { searchByPhoto, PhotoSearchError } = require('./photo-search');
const { searchKeywordIds } = require('./keyword-search');
const { getAutocomplete } = require('./autocomplete');
const { aiRateLimit } = require('./rate-limit');
const usage = require('./usage');

const router = express.Router();

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (req, file, done) =>
    PHOTO_TYPES.includes(file.mimetype)
      ? done(null, true)
      : done(new PhotoSearchError('Use a JPG, PNG or WEBP photo', 400)),
});

// Maps any error to a JSON answer the browser can show.
function sendError(res, error, label) {
  if (error instanceof AiSearchError || error instanceof PhotoSearchError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  if (error?.status === 429) {
    return res.status(429).json({ success: false, message: 'Search is busy, try again shortly' });
  }
  console.error(`${label} failed:`, error);
  res.status(500).json({ success: false, message: `${label} failed` });
}

router.post('/ai', express.json({ limit: '10kb' }), aiRateLimit, async (req, res) => {
  try {
    res.json({ success: true, ...(await interpretSearch(req.body?.query)) });
  } catch (error) {
    sendError(res, error, 'AI search');
  }
});

router.post(
  '/photo',
  aiRateLimit,
  (req, res, next) =>
    upload.single('photo')(req, res, error => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'The photo is too big (max 5 MB)' });
      }
      const status = error instanceof PhotoSearchError ? error.status : 400;
      res.status(status).json({ success: false, message: error.message });
    }),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Add a photo to search with' });
    }
    try {
      const item = Number.parseInt(req.body?.item, 10) || 0;
      res.json({ success: true, ...(await searchByPhoto(req.file.buffer, req.file.mimetype, item)) });
    } catch (error) {
      sendError(res, error, 'Photo search');
    }
  }
);

// No Claude calls here, so no AI rate limit.
router.get('/keywords', async (req, res) => {
  try {
    res.json({ success: true, ...(await searchKeywordIds(req.query.q)) });
  } catch (error) {
    sendError(res, error, 'Keyword search');
  }
});

// Suggestions while typing. No Claude calls here either.
router.get('/autocomplete', async (req, res) => {
  try {
    res.json({ success: true, ...(await getAutocomplete(req.query.q)) });
  } catch (error) {
    sendError(res, error, 'Autocomplete');
  }
});

// Load the local models in the background so the first search is not slow.
// Only when the store has rows; never blocks or crashes startup.
setTimeout(() => {
  const { store } = require('./vector-store/store');
  const { textVector, clipTextVector } = require('./vector-store/embed');
  store
    .count()
    .then(rows =>
      rows > 0 ? Promise.all([textVector('warm up'), clipTextVector('warm up')]) : null
    )
    .then(done => done && console.log('Smart Search models ready'))
    .catch(error => console.error('Smart Search model warm-up failed:', error.message));
}, 0);

router.get('/stats', (req, res) => res.json({ success: true, ...usage.stats() }));

module.exports = router;

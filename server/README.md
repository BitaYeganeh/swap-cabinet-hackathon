# Server

## Vector store (photo search and meaning search)

1. `npm install`
2. `npm run sync` fills `data/lancedb/` from the live marketplace. The first run downloads the
   models (about 430 MB into `data/models/`) and labels every listing with Claude (needs
   `ANTHROPIC_API_KEY`). Later runs only process new or changed listings and remove sold ones.
3. `npm start`

Run `npm run sync` again after adding or editing listings. `npm test` runs the unit tests.

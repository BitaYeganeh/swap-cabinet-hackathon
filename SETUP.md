# How to run the project

This guide lists everything you need to run the search app on your own computer.

## 1. What you need first

| Need | Details |
|---|---|
| **Node.js** | Version 22 or newer (tested with 26). Check with `node -v`. |
| **npm** | Comes with Node.js. Check with `npm -v`. |
| **Git** | To get the code. |
| **Internet** | The app talks to Sharetribe and Claude. The first sync also downloads the AI models. |
| **Free disk space** | About 1 GB: about 430 MB for the AI models, plus the `node_modules` folders. |
| **Free ports** | `3000` (server) and `5173` (website). |

## 2. Keys you need

Ask Farouq or the team for the values. Never commit them and never put them in the client code.

| Key | Used for | Where to get it |
|---|---|---|
| `SHARETRIBE_CLIENT_ID` | Reading the marketplace listings | The team's credentials PDF |
| `ANTHROPIC_API_KEY` | AI search and photo labels (Claude) | The team's shared key from the hackathon organizers |

Optional settings (they have safe defaults):

| Setting | Default | What it does |
|---|---|---|
| `AI_DAILY_BUDGET_USD` | `5` | AI search and photo search stop for the day after this much spend |
| `AI_SEARCHES_PER_MINUTE` | `10` | AI searches allowed per visitor per minute |
| `PORT` | `3000` | The server port |

## 3. Get the code

```bash
git clone https://github.com/Z4Tauhid/Hackathon_team4.git
cd Hackathon_team4
```

## 4. Set up the server

```bash
cd server
npm install
cp .env.example .env
```

Open `server/.env` and fill in `SHARETRIBE_CLIENT_ID` and `ANTHROPIC_API_KEY`.

## 5. Fill the search database (one time)

Still in `server/`:

```bash
npm run sync
```

- This reads every listing from Sharetribe, lets Claude label it, and saves it in `server/data/`.
- The first run takes about 2 minutes, downloads the AI models (about 430 MB), and costs about $1 in Claude calls.
- Later runs only handle new or changed listings, and remove sold ones. They take a few seconds.
- Run it again whenever listings are added, edited or sold.

Without this step the app still works, but photo search and meaning search find nothing.

## 6. Start the server

Still in `server/`:

```bash
npm run dev
```

Wait for `Server running on http://localhost:3000`, then `Search models ready`.

## 7. Start the website

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173.

## 8. Try it

- **Text search:** type something like "a warm sweater" in the search bar.
- **Photo search:** click the camera button in the search bar and pick a photo of a clothing item. The results come in groups: Same product, Exact matches, Similar items, Other items, plus "People also look for this".

## 9. Check that everything works

In `server/`:

```bash
npm test
```

All tests should pass. The test for the AI models needs internet.

## Common problems

| Problem | Fix |
|---|---|
| `Can't reach the server` in the website | The server is not running. Start it (step 6). |
| Port 3000 or 5173 is already in use | Stop the other program, or set another `PORT` in `server/.env`. If you change the server port, also change the proxy in `client/vite.config.ts`. |
| Photo search finds nothing | Run `npm run sync` in `server/` (step 5). |
| "Photo search has reached today's limit" | The daily AI budget is used up. Raise `AI_DAILY_BUDGET_USD` in `server/.env` and restart the server. |
| The first search is slow | The AI models load on the first use. After `Search models ready` shows in the server log, searches are fast. |

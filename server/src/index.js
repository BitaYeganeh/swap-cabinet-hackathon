require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const listingsRouter = require("./routes/listings");
const searchRouter = require("./routes/search");
const imageSearchRouter = require("./routes/imageSearch");

const app = express();

app.use(cors());
app.use(express.json());

// The built client (`npm run build` in client/), if there is one: then this one
// server is the whole site on one address, e.g. http://<laptop-ip>:3000 for
// anyone on the same network. Without a build it is the API only, as before.
// Checked per request, so a build made while the server runs is picked up.
const CLIENT_DIST = path.join(__dirname, "../../client/dist");
const CLIENT_PAGE = path.join(CLIENT_DIST, "index.html");
const hasClient = () => fs.existsSync(CLIENT_PAGE);
const serveStatic = express.static(CLIENT_DIST);

app.use((req, res, next) => (hasClient() ? serveStatic(req, res, next) : next()));

app.get("/", (req, res) => {
  res.json({
    message: "Team 4 Sharetribe Search API",
  });
});

app.use("/api/listings", listingsRouter);
app.use("/api/search/image", imageSearchRouter);
app.use("/api/search", searchRouter);

// Client routes (/photo, ?item=…) are handled in the browser: every other GET
// that isn't an API call gets the app's page.
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/") || !hasClient()) return next();
  res.sendFile(CLIENT_PAGE);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (hasClient()) console.log("Serving the built client from client/dist");

  // Load the local models in the background so the first search is not slow.
  const { store } = require("./vectorStore/store");
  const { textVector, clipTextVector } = require("./vectorStore/embed");
  store
    .count()
    .then((rows) => (rows > 0 ? Promise.all([textVector("warm up"), clipTextVector("warm up")]) : null))
    .then((done) => done && console.log("Search models ready"))
    .catch((error) => console.error("Model warm-up failed:", error.message));
});

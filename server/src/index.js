require("dotenv").config();

const express = require("express");
const cors = require("cors");

const listingsRouter = require("./routes/listings");
const searchRouter = require("./routes/search");
const imageSearchRouter = require("./routes/imageSearch");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Team 4 Sharetribe Search API",
  });
});

app.use("/api/listings", listingsRouter);
app.use("/api/search/image", imageSearchRouter);
app.use("/api/search", searchRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Load the local models in the background so the first search is not slow.
  const { store } = require("./vectorStore/store");
  const { textVector, clipTextVector } = require("./vectorStore/embed");
  store
    .count()
    .then((rows) => (rows > 0 ? Promise.all([textVector("warm up"), clipTextVector("warm up")]) : null))
    .then((done) => done && console.log("Search models ready"))
    .catch((error) => console.error("Model warm-up failed:", error.message));
});

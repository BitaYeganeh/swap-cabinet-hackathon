require("dotenv").config();

const express = require("express");
const cors = require("cors");

const listingsRouter = require("./routes/listings");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Team 4 Sharetribe Search API",
  });
});

app.use("/api/listings", listingsRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
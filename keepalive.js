const express = require("express");
const app = express();

app.all("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(3000, () => console.log("Botin pitäisi nyt pysyä hereillä!"));

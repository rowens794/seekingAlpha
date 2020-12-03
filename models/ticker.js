const mongoose = require("mongoose");

const tickerSchema = new mongoose.Schema({
  ticker: { type: String, index: true },
  name: String,
  sector: String,
  industry: String,
  pageViews: String,
  lastCovered: Object,
  payment: String,
  tickerIsActive: { type: Boolean, index: true },
});

const Ticker = mongoose.model("Ticker", tickerSchema);

module.exports = Ticker;

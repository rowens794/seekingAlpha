const Ticker = require("../models/ticker");

exports.getPageViews = async (req, res) => {
  let ticker = req.params.ticker.toUpperCase();
  console.log(ticker);
  let doc = await Ticker.findOne({ ticker: ticker });
  let pageViews = doc ? doc.pageViews : "NA";
  res.send(pageViews);
};

exports.getPayment = async (req, res) => {
  let ticker = req.params.ticker.toUpperCase();
  console.log(ticker);
  let doc = await Ticker.findOne({ ticker: ticker });
  let payment = doc ? doc.payment : "NA";
  res.send(payment);
};

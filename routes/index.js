var express = require("express");
var router = express.Router();

const getList = require("../controllers/getSAList");
const getTicker = require("../controllers/getSingleTicker");
/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

router.get("/sa", function (req, res, next) {
  getList.getList();
  res.send("getting seeking alpha list");
});

router.get("/pageViews/:ticker", function (req, res, next) {
  getTicker.getPageViews(req, res);
});

router.get("/payment/:ticker", function (req, res, next) {
  getTicker.getPayment(req, res);
});

module.exports = router;

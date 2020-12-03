var express = require("express");
var router = express.Router();

const getList = require("../controllers/getSAList");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

router.get("/sa", function (req, res, next) {
  getList.getList();
  res.send("getting seeking alpha list");
});

module.exports = router;

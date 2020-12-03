const Axios = require("axios");
const csv = require("csvtojson");
const dayjs = require("dayjs");
const nodemailer = require("nodemailer");
const nodemailerSendgrid = require("nodemailer-sendgrid");

const Ticker = require("../models/ticker");

const tickersFollowed = [
  "FAT",
  "TAST",
  "LOCO",
  "BJRI",
  "DNKN",
  "RICK",
  "NDLS",
  "LUB",
  "TACO",
  "PZZA",
  "TXRH",
  "RRGB",
  "CHUY",
  "BJRI",
  "CBRL",
  "CAKE",
  "PLAY",
  "DRI",
  "BLMN",
];

exports.getList = async () => {
  let listLink = "https://seekingalpha.com/account/undercovered_stocks.csv";
  let file = await getCSV(listLink);
  let object = await convertFileToObject(file);
  let [removals, additions] = await processObject(object);
  let mySecurities = await getMySecurities(tickersFollowed);
  let response = buildResponseString(mySecurities, additions, removals, tickersFollowed);
  sendEmail(response);
};

const getCSV = async (url) => {
  let promise = new Promise(async (resolve, reject) => {
    const response = await Axios({
      url,
      method: "GET",
    });

    resolve(response);
  });

  return promise;
};

const convertFileToObject = async (file) => {
  let promise = new Promise(async (resolve, reject) => {
    let returnObject = [];
    let splitData = file.data.split("\n");
    for (i = 1; i < splitData.length; i++) {
      let itemArray = await getRowArray(splitData[i]);

      if (itemArray) {
        returnObject.push({
          ticker: itemArray[0],
          name: itemArray[1],
          sector: itemArray[2],
          industry: itemArray[3],
          pageViews: itemArray[4],
          lastCovered: itemArray[5],
          payment: itemArray[6],
        });
      }
    }

    resolve(returnObject);
  });

  return promise;
};

const getRowArray = (row) => {
  let promise = new Promise((res, rej) => {
    csv({
      noheader: true,
      output: "csv",
    })
      .fromString(row)
      .then((csvRow) => {
        res(csvRow[0]);
      });
  });

  return promise;
};

const processObject = async (object) => {
  let promise = new Promise(async (resolve, reject) => {
    let newAdditions = [];
    let removals = [];
    let allTickersFromSA = [];
    let documentHopper = [];

    //process all of the new tickers from Seeking Alpha
    for (i = 0; i < object.length; i++) {
      let security = object[i];
      allTickersFromSA.push(security.ticker);

      //save list of documents once 100 have accumulated
      if (i % 500 === 0 && i > 0) {
        let allSecurities = await processSABlock(documentHopper);

        allSecurities.forEach((sec) => {
          if (sec) newAdditions.push(sec);
        });

        documentHopper = [];
      }

      documentHopper.push(processSingleSecurity(security));

      if (i % 500 === 0) console.log(`processing SA Tickers: ${i}`);
    }

    //catch the final elements in document hopper
    let allSecurities = await processSABlock(documentHopper);
    allSecurities.forEach((sec) => {
      if (sec) newAdditions.push(sec);
    });

    //determine if any securities were removed from the list
    let activeTickers = await Ticker.find({ tickerIsActive: true });
    for (i = 0; i < activeTickers.length; i++) {
      let dbDoc = activeTickers[i];

      if (allTickersFromSA.indexOf(dbDoc.ticker) === -1) {
        dbDoc.lastCovered = dayjs(new Date()).format("MM/DD/YYYY");
        dbDoc.payment = null;
        dbDoc.tickerIsActive = false;
        removals.push(dbDoc);
        await dbDoc.save();
      }

      if (i % 100 === 0) console.log(`processing Removed Tickers: ${i}`);
    }

    newAdditions = await getNewAdditionDocs(newAdditions);
    resolve([removals, newAdditions]);
  });

  return promise;
};

const processSingleSecurity = (security) => {
  let promise = new Promise(async (resolve, reject) => {
    let dbDoc = await Ticker.findOne({ ticker: security.ticker });
    //check if the security is in database
    if (dbDoc) {
      dbDoc.ticker = security.ticker;
      dbDoc.name = security.name;
      dbDoc.sector = security.sector;
      dbDoc.industry = security.industry;
      dbDoc.pageViews = security.pageViews;
      dbDoc.lastCovered = security.lastCovered;
      dbDoc.payment = security.payment;
      dbDoc.tickerIsActive = true;
      dbDoc.save((err, doc) => {
        resolve(null);
      });
    } else {
      let dbDoc = new Ticker({
        ticker: security.ticker,
        name: security.name,
        sector: security.sector,
        industry: security.industry,
        pageViews: security.pageViews,
        lastCovered: security.lastCovered,
        payment: security.payment,
        tickerIsActive: true,
      });

      dbDoc.save((err, doc) => {
        resolve(doc.ticker);
      });
    }
  });

  return promise;
};

const processSABlock = (list) => {
  let promise = new Promise(async (resolve, reject) => {
    await Promise.all(list).then((values) => {
      resolve(values);
    });
  });

  return promise;
};

const getNewAdditionDocs = (tickers) => {
  let promise = new Promise(async (resolve, reject) => {
    let docs = await Ticker.find({ ticker: { $in: tickers } });
    resolve(docs);
  });
  return promise;
};

const getMySecurities = (tickers) => {
  let promise = new Promise(async (resolve, reject) => {
    let dbDocs = await Ticker.find({ ticker: { $in: tickers } });
    resolve(dbDocs);
  });

  return promise;
};

const buildResponseString = (mySecurities, additions, removals, tickersFollowed) => {
  activeSecs = [];
  inactiveSecs = [];
  addns = [];
  remvls = [];

  mySecurities.sort((x, y) => x.payment - y.payment);

  mySecurities.forEach((security) => {
    if (security.tickerIsActive) {
      activeSecs.push(createSecurityString(security));
    } else {
      inactiveSecs.push(createSecurityString(security));
    }
  });

  removals.forEach((rem) => {
    if (tickersFollowed.indexOf(rem.ticker) !== -1) {
      remvls.push(createSecurityString(security));
    }
  });

  additions.forEach((sec) => {
    if (tickersFollowed.indexOf(sec.ticker) !== -1) {
      addns.push(createSecurityString(security));
    }
  });

  return {
    activeSecs: activeSecs,
    inactiveSecs: inactiveSecs,
    additions: addns,
    removals: remvls,
  };
};

const createSecurityString = (sec) => {
  let name = sec.name ? sec.name.substr(0, 15) : "";
  while (name.length < 15) name = name.concat("_");

  let ticker = sec.ticker;
  while (ticker.length < 5) ticker = ticker.concat("_");

  let payment = sec.payment;
  while (payment.length < 4) payment = payment.concat("_");

  let pageviews = new Number(sec.pageViews);
  pageviews = Math.round(pageviews / 1000);

  return `${ticker}  | ${sec.tickerIsActive ? "O" : "X"} | ${payment} | ${name} | ${pageviews}k`;
};

const sendEmail = (response) => {
  // Configure Nodemailer SendGrid Transporter
  const transport = nodemailer.createTransport(
    nodemailerSendgrid({
      apiKey: process.env.SENDGRID_API_PASSWORD,
    })
  );

  let emailText = createEmailBody(response);

  // Send Email
  transport.sendMail({
    from: "SEEKING ALPHA UPDATE@intellispect.co",
    to: "rowens794@gmail.com",
    subject: "Seeking Alpha List Update",
    text: emailText,
    html: `<p style='font-family: Courier'>${emailText}</p>`,
  });
};

const createEmailBody = (obj) => {
  let string = "REMOVALS<br/>";
  console.log(obj);

  obj.removals.forEach((rem) => {
    string = string.concat(`${rem}<br/>`);
  });

  string = string.concat("<br/><br/>ACTIVE SECURITIES<br/>");
  obj.activeSecs.forEach((sec) => {
    string = string.concat(`${sec}<br/>`);
  });

  return string;
};

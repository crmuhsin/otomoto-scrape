
const { fork } = require("child_process");
const { getNewPageHtml } = require('./getnewpage');

const {
  initialUrl,
  chunkSize,
  adList,
  writeInJson,
  addItems,
  getNextPageUrl,
} = require("./common");

let adDetailList = []

async function startScraping() {
  try {
    let url = initialUrl;
    while (url) {
      console.log("page", url);
      let $ = await getNewPageHtml(url);
      addItems($);
      url = getNextPageUrl($);
    }
    console.log(24, adList.length);
    console.time('fetch-scrapping')
    console.log('started')
    let i, j, temporary;
    for (i = 0, j = adList.length; i < j; i += chunkSize) {
      temporary = adList.slice(i, i + chunkSize);
      // do whatever
      const scrape = fork("./scrape.js");
      scrape.send({ temporary, i });
      scrape.on("message", list => {
        adDetailList = [].concat(adDetailList, list)
        console.log(36, adDetailList.length);
        writeInJson(adDetailList);
        scrape.disconnect();
        if (adList.length == adDetailList.length) {
          console.timeEnd('fetch-scrapping')
        }
      });
    }
    console.log('ended')
  } catch (error) {
    console.log(error);
  }
}

startScraping();

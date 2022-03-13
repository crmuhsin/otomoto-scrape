const puppeteer = require("puppeteer");
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
let browser

async function configureBrowser() {
  browser = await puppeteer.launch({
    headless: false,
    executablePath: 'H:/chromium/chrome.exe'
  });
  const page = await browser.newPage();
  // await page.setViewport({ width: 1024, height: 768 });
  page.setDefaultNavigationTimeout(0);
  return page;
}

async function startScraping() {
  try {
    let url = initialUrl;
    let page = await configureBrowser();
    while (url) {
      console.log("page", url);
      let $ = await getNewPageHtml(url, page);
      addItems($);
      url = getNextPageUrl($);
    }
    console.log(39, adList.length);
    console.time('puppet-scrapping')
    console.log('started')
    let i, j, temporary;
    for (i = 0, j = adList.length; i < j; i += chunkSize) {
      temporary = adList.slice(i, i + chunkSize);
      // do whatever
      const scrape = fork("./scrape.js");
      scrape.send({ temporary, i });
      scrape.on("message", list => {
        adDetailList = [].concat(adDetailList, list)
        console.log(50, adDetailList.length);
        writeInJson(adDetailList);
        scrape.disconnect();
        if (adList.length == adDetailList.length) {
          console.timeEnd('puppet-scrapping')
          browser.close();
        }
      });
    }
    console.log('ended')
  } catch (error) {
    console.log(error);
    browser.close();
  }
}

startScraping();

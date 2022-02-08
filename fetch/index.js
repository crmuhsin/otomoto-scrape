const fs = require("fs");
const path = require("path");
const { fork } = require("child_process");
const { getNewPageHtml } = require('./getnewpage');

const baseUrl = "https://www.otomoto.pl";
const initialUrl =
  "https://www.otomoto.pl/ciezarowe/uzytkowe/mercedes-benz/od-2014/q-actros?search%5Bfilter_enum_damaged%5D=0&search%5Border%5D=created_at%3Adesc";

const adList = [];
let adDetailList = [];

const filePath = "./trucks.json";

const isExists = (path) => {
  try {
    fs.access(path);
    return true;
  } catch {
    return false;
  }
};

function getNextPageUrl($) {
  let nextPageUrl = undefined;
  let foundCurrent = false;
  $(".pagination-item").each((i, elem) => {
    let isActive = $(elem).attr("class").includes("pagination-item__active");
    let url = $("a", elem).attr("href");

    if (nextPageUrl) {
      return;
    }

    if (foundCurrent && url) {
      nextPageUrl = baseUrl + url;
    }

    if (isActive) {
      foundCurrent = true;
    }
  });

  return nextPageUrl;
}

async function writeInJson() {
  try {
    let data = JSON.stringify(adDetailList, null, 2);
    const dirname = path.dirname(filePath);
    const exist = isExists(dirname);
    if (!exist) {
      fs.mkdir(dirname, { recursive: true }, (err) => {
        if (err) throw err;
      });
    }
    fs.writeFile(filePath, data, "utf8", (err) => {
      if (err) throw err;
      console.log("saved");
    });
  } catch (error) {
    throw error;
  }
}

function addItems($) {
  $('article[data-testid="listing-ad"]').each(function (i, el) {
    let itemId = $(this).attr("id");
    let itemUrl = $("a", el).attr("href");
    adList.push({ itemId, itemUrl });
  });
}

async function startScraping() {
  try {
    let url = initialUrl;
    while (url) {
      console.log("page", url);
      let $ = await getNewPageHtml(url);
      addItems($);
      url = getNextPageUrl($);
    }
    console.log(adList.length);
    console.time('fetch-scrapping')
    console.log('started')
    let i, j, temporary, chunkSize = 30;
    for (i = 0, j = adList.length; i < j; i += chunkSize) {
      temporary = adList.slice(i, i + chunkSize);
      // do whatever
      const scrape = fork("scrape.js");
      scrape.send({temporary, i});
      scrape.on("message", list => {
        adDetailList = [].concat(adDetailList, list) 
        console.log(93, adDetailList.length);
        writeInJson();
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

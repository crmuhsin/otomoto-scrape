const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const initialUrl =
  "https://www.otomoto.pl/ciezarowe/uzytkowe/mercedes-benz/od-2014/q-actros?search%5Bfilter_enum_damaged%5D=0&search%5Border%5D=created_at%3Adesc";

const adList = [];
const adDetailList = [];

const filePath = "./trucks.json";

const maxRetryNumber = 5;
let retryNumber = 0;

const isExists = (path) => {
  try {
    fs.access(path);
    return true;
  } catch {
    return false;
  }
};

async function configureBrowser() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768 });
  await page.setDefaultNavigationTimeout(0);
  return { browser, page };
}

async function getNewPageHtml(page, url) {
  try {
    retryNumber++;
    if (retryNumber >= maxRetryNumber) {
      console.log(" retryNumber exceeded maxRetryNumber ! ");
      return;
    }
    await page.waitForTimeout(retryNumber * 1000);
    await page.goto(url, { waitUntil: "networkidle2" });
    let html = page.evaluate(() => document.body.innerHTML);
    retryNumber = 0;
    return html;
  } catch (error) {
    getNewPageHtml(page, url);
  }
}

async function getTotalAdsCount(html) {
  let $ = cheerio.load(html);
  let totalAds = $("h1.optimus-app-xeol1s-Text").text();
  totalAds = totalAds.split(" ")[2];
  return totalAds;
}

function getNextPageUrl(index) {
  return `${initialUrl}&page=${index + 1}`;
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

async function addItems(html) {
  let $ = cheerio.load(html);
  $('article[data-testid="listing-ad"]').each(function (i, el) {
    let itemId = $(this).attr("id");
    let itemUrl = $("a", el).attr("href");
    adList.push({ itemId, itemUrl });
  });
}

function trimString (string) {
  return string.text().replace(/\s+/g,' ').trim()
}

async function scrapeTruckItem(page, item) {
  try {
    let html = await getNewPageHtml(page, item.itemUrl);
    let $ = cheerio.load(html);
    let title = trimString($("h1.offer-title").first());
    let price = trimString($("span.offer-price__number").first());
    let registrationDate = "";
    let productionDate = "";
    let mileage = "";
    let power = "";
    $("li.offer-params__item").each(function (i, el) {
      switch ($("span", el).text()) {
        case "Pierwsza rejestracja":
          registrationDate = trimString($("div", el));
          break;
        case "Rok produkcji":
          productionDate = trimString($("div", el));
          break;
        case "Przebieg":
          mileage = trimString($("div", el));
          break;
        case "Moc":
          power = trimString($("div", el));
          break;
      }
    });
    let truck = {
      itemId: item.itemId,
      title,
      price,
      registrationDate,
      productionDate,
      mileage,
      power,
    };
    return truck;
  } catch (error) {
    console.log(error);
    return;
  }
}

async function startScraping() {
  try {
    let url = "";
    let { browser, page } = await configureBrowser();
    let html = await getNewPageHtml(page, initialUrl);
    let totalAds = await getTotalAdsCount(html);
    let totalPage = Math.ceil(+totalAds / 32);
    for (let index = 0; index < totalPage; index++) {
      if (index) {
        url = getNextPageUrl(index);
        html = await getNewPageHtml(page, url);
      }
      console.log("page", index + 1);
      addItems(html);
    }
    for (let index = 0; index < adList.length; index++) {
      const item = adList[index];
      let truck = await scrapeTruckItem(page, item);
      console.log("truck", index + 1);
      console.log(truck);
      adDetailList.push(truck);
    }
    writeInJson();
    await browser.close();
  } catch (error) {
    console.log(error);
    await browser.close();
  }
}

startScraping();

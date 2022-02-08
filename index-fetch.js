const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const baseUrl = "https://www.otomoto.pl";
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

async function getNewPageHtml(url) {
  try {
    retryNumber++;
    if (retryNumber >= maxRetryNumber) {
      console.log(" retryNumber exceeded maxRetryNumber ! ");
      return;
    }
    let response = await fetch(url);
    let html = await response.text();
    let $ = cheerio.load(html);
    retryNumber = 0;
    return $;
  } catch (error) {
    getNewPageHtml(url);
  }
}

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

function trimString(string) {
  return string.text().replace(/\s+/g, " ").trim();
}

async function scrapeTruckItem(item) {
  try {
    let $ = await getNewPageHtml(item.itemUrl);
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
    let url = initialUrl;
    while (url) {
      console.log("page", url);
      let $ = await getNewPageHtml(url);
      addItems($);
      url = getNextPageUrl($);
    }
    console.log("adList", adList.length);
    for (let index = 0; index < adList.length; index++) {
      const item = adList[index];
      let truck = await scrapeTruckItem(item);
      console.log("truck", index + 1);
      console.log(truck);
      adDetailList.push(truck);
    }
    writeInJson();
  } catch (error) {
    console.log(error);
  }
}

startScraping();

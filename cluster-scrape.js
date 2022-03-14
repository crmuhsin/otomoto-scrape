const { Cluster } = require('puppeteer-cluster');
const { getNewPageHtml } = require('./getnewpage');
const {
  adList,
  initialUrl,
  addItems,
  getNextPageUrl,
  writeInJson
} = require("./common");

const { scrapeTruckItem } = require('./scrape')

let adDetailList = [];

const clusterOptions = {
  concurrency: Cluster.CONCURRENCY_CONTEXT,
  maxConcurrency: 4,
  puppeteerOptions: {
    headless: false,
    executablePath: 'H:/chromium/chrome.exe'
  }
}

async function getItemUrls() {
  const cluster1 = await Cluster.launch(clusterOptions);
  
  await cluster1.task(async ({ page, data: url }) => {
    let $ = await getNewPageHtml(url, page);
    addItems($);
    url = getNextPageUrl($);
    return url
  });
  
  try {
    let url = initialUrl;
    while (url) {
      console.log("page", url);
      url = await cluster1.execute(url);
    }
  } catch (error) {
    console.log(34, error);    
  }

  console.log(42, adList.length);
  await cluster1.idle();
  await cluster1.close();
}

async function scrapeItems() {
  const cluster2 = await Cluster.launch(clusterOptions);

  await cluster2.task(async ({ page, data }) => {
    let truck = await scrapeTruckItem(data.item, page)
    adDetailList.push(truck)
  });

  try {
    for (i = 0; i < adList.length; i++) {
      let item = adList[i]
      cluster2.queue({item})
    }
  } catch (error) {
    console.log(82, error);    
  }

  await cluster2.idle();
  await cluster2.close();
}

async function startScraping() {
  await getItemUrls()
  await scrapeItems()
  console.log(74, adDetailList.length);
  writeInJson(adDetailList);
}

startScraping();

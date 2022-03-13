const cheerio = require("cheerio");
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

const maxRetryNumber = 5;
let retryNumber = 0;

async function getNewPageHtml(url, page) {
    try {
        retryNumber++;
        if (retryNumber >= maxRetryNumber) {
            console.log(" retryNumber exceeded maxRetryNumber ! ");
            return;
        }
        let html
        if (page) {
            await page.waitForTimeout(retryNumber * 1000);
            await page.goto(url, { waitUntil: "networkidle2" });
            html = await page.evaluate(() => document.body.innerHTML);
        } else {
            let response = await fetch(url);
            html = await response.text();
        }
        let $ = cheerio.load(html);
        retryNumber = 0;
        return $;
    } catch (error) {
       await getNewPageHtml(url, page);
    }
}

module.exports = {
    getNewPageHtml
}
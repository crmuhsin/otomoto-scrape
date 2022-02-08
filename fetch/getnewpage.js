const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const cheerio = require("cheerio");

const maxRetryNumber = 5;
let retryNumber = 0;

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

module.exports = {
    getNewPageHtml
}
const fs = require("fs");
const path = require("path");
const queryString = require('query-string');

const baseUrl = "https://www.otomoto.pl";

const initialUrl = `https://www.otomoto.pl/ciezarowe/uzytkowe/mercedes-benz/od-2014/q-actros?search%5Bfilter_enum_damaged%5D=0&search%5Border%5D=created_at%3Adesc`;

const chunkSize = 30;
const adList = [];

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

    const nextButton = !$('li[data-testid="pagination-step-forwards"]')
        ?.attr("class")
        ?.includes("pagination-item__disabled")

    const link = $(".pagination-item__active").find("a").attr("href")

    const url = baseUrl + link

    const split = url.split('?')

    const params = queryString.parse(split[1])

    params.page = params.page ? `${Number(params.page) + 1}` : '2'

    if (nextButton) {
        nextPageUrl = split[0] + '?' + queryString.stringify(params)
    }

    return nextPageUrl;
}

async function writeInJson(writeData) {
    try {
        let data = JSON.stringify(writeData, null, 2);
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

module.exports = {
    initialUrl,
    chunkSize,
    adList,
    filePath,
    isExists,
    getNextPageUrl,
    writeInJson,
    addItems,
}

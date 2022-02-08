const { getNewPageHtml } = require('./getnewpage');

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
let counter
const scraping = async (adList) => {
    let adDetailList = []
    for (let index = 0; index < adList.length; index++) {
        const item = adList[index];
        let truck = await scrapeTruckItem(item);
        // console.log("truck", truck);
        adDetailList.push(truck);
    }
    return adDetailList
};

process.on("message", async (msg) => {
    counter = msg.i
    console.log(61, msg.i, "start")
    const adDetailList = await scraping(msg.temporary);
    process.send(adDetailList);
    console.log(61, msg.i, "end")
});

process.on('exit', (code) => {
    console.log(`${counter} child process exited with code ${code}`);
});

// 117 results
// 30 chunk 43.201s
// 10 chunk 11.183s
// 4 chunk 6.539s

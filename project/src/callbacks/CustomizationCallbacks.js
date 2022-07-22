"use strict";

require("../Lib.js");

class CustomizationCallbacks
{
    static getSuits(url, info, sessionID)
    {
        return HttpResponse.getBody({
            "_id": `pmc${sessionID}`,
            "suites": SaveServer.profiles[sessionID].suits
        });
    }

    static getTraderSuits(url, info, sessionID)
    {
        const splittedUrl = url.split("/");
        const traderID = splittedUrl[splittedUrl.length - 2];

        return HttpResponse.getBody(CustomizationController.getTraderSuits(traderID, sessionID));
    }

    static wearClothing(pmcData, body, sessionID)
    {
        return CustomizationController.wearClothing(pmcData, body, sessionID);
    }

    static buyClothing(pmcData, body, sessionID)
    {
        return CustomizationController.buyClothing(pmcData, body, sessionID);
    }
}

module.exports = CustomizationCallbacks;

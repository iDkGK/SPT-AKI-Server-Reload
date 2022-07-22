"use strict";

require("../Lib.js");

class TraderCallbacks
{
    static load()
    {
        TraderController.load();
    }

    static getTraderSettings(url, info, sessionID)
    {
        return HttpResponse.getBody(TraderController.getAllTraders(sessionID));
    }

    static getProfilePurchases(url, info, sessionID)
    {
        const traderID = url.substr(url.lastIndexOf("/") + 1);
        return HttpResponse.getBody(TraderController.getPurchasesData(traderID, sessionID));
    }

    static getTrader(url, info, sessionID)
    {
        const traderID = url.replace("/client/trading/api/getTrader/", "");
        TraderController.updateTraders();
        return HttpResponse.getBody(TraderController.getTrader(traderID, sessionID));
    }

    static getAssort(url, info, sessionID)
    {
        const traderID = url.replace("/client/trading/api/getTraderAssort/", "");
        TraderController.updateTraders();
        return HttpResponse.getBody(TraderController.getAssort(sessionID, traderID));
    }

    static update()
    {
        return TraderController.updateTraders();
    }
}

module.exports = TraderCallbacks;

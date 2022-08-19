"use strict";

require("../Lib.js");

class TraderCallbacks
{
    static load()
    {
        TraderController.load();
    }

    static update()
    {
        return TraderController.update();
    }

    static getTraderSettings(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            TraderController.getAllTraders(sessionID)
        );
    }

    static getProfilePurchases(url, info, sessionID)
    {
        const traderID = url.substr(url.lastIndexOf("/") + 1);
        return HttpResponseUtil.getBody(
            TraderController.getPurchasesData(sessionID, traderID)
        );
    }

    static getTrader(url, info, sessionID)
    {
        const traderID = url.replace("/client/trading/api/getTrader/", "");
        return HttpResponseUtil.getBody(
            TraderController.getTrader(sessionID, traderID)
        );
    }

    static getAssort(url, info, sessionID)
    {
        const traderID = url.replace(
            "/client/trading/api/getTraderAssort/",
            ""
        );
        return HttpResponseUtil.getBody(
            TraderController.getAssort(sessionID, traderID)
        );
    }
}

module.exports = TraderCallbacks;

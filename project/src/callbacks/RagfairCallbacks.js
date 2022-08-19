"use strict";

require("../Lib.js");

class RagfairCallbacks
{
    static load()
    {
        RagfairServer.load();
    }

    static update(timeSinceLastRun)
    {
        if (timeSinceLastRun > RagfairConfig.runIntervalSeconds)
        {
            // There is a flag inside this class that only makes it run once.
            RagfairServer.addPlayerOffers();
            RagfairServer.update();
            // function below used to be split, merged
            RagfairController.update();
            return true;
        }

        return false;
    }

    static search(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            RagfairController.getOffers(sessionID, info)
        );
    }

    static getMarketPrice(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(RagfairController.getItemPrice(info));
    }

    static getItemPrices(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(RagfairController.getAllFleaPrices());
    }

    static addOffer(pmcData, info, sessionID)
    {
        return RagfairController.addPlayerOffer(pmcData, info, sessionID);
    }

    static removeOffer(pmcData, info, sessionID)
    {
        return RagfairController.removeOffer(info.offerId, sessionID);
    }

    static extendOffer(pmcData, info, sessionID)
    {
        Logger.debug(JsonUtil.serialize(info)); // TODO: Remove this once finished
        return RagfairController.extendOffer(info, sessionID);
    }

    static sendReport(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }
}

module.exports = RagfairCallbacks;

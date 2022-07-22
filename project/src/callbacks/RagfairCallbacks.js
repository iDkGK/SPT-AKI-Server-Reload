"use strict";

require("../Lib.js");

class RagfairCallbacks
{
    static load()
    {
        RagfairServer.load();
    }

    static search(url, info, sessionID)
    {
        return HttpResponse.getBody(RagfairController.getOffers(sessionID, info));
    }

    static getMarketPrice(url, info, sessionID)
    {
        return HttpResponse.getBody(RagfairController.getItemPrice(info));
    }

    static getItemPrices(url, info, sessionID)
    {
        return HttpResponse.getBody(RagfairServer.getAllFleaPrices());
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

    static update(timeSinceLastRun)
    {
        if (timeSinceLastRun > RagfairConfig.runIntervalSeconds)
        {
            RagfairServer.update();
            return true;
        }

        return false;
    }

    /* todo: merge remains with main update function above */
    static updatePlayer(timeSinceLastRun)
    {
        if (timeSinceLastRun > RagfairConfig.runIntervalSeconds)
        {
            RagfairController.update();
            return true;
        }

        return false;
    }
}

module.exports = RagfairCallbacks;

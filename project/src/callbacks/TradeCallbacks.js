"use strict";

require("../Lib.js");

class TradeCallbacks
{
    static processTrade(pmcData, body, sessionID)
    {
        return TradeController.confirmTrading(pmcData, body, sessionID);
    }

    static processRagfairTrade(pmcData, body, sessionID)
    {
        return TradeController.confirmRagfairTrading(pmcData, body, sessionID);
    }
}

module.exports = TradeCallbacks;

"use strict";

require("../Lib.js");

class TraderController
{
    /**
     * Runs when onLoad event is fired
     * Iterate over traders, ensure an unmolested copy of their assorts is stored in traderAssortService
     * Store timestamp of next assort refresh in nextResupply property of traders .base object
     */
    static load()
    {
        for (const traderID in DatabaseServer.getTables().traders)
        {
            const trader = DatabaseServer.getTables().traders[traderID];

            // Create dict of trader assorts on server start
            if (!TraderAssortService.getPristineTraderAssort(traderID))
            {
                TraderAssortService.setPristineTraderAssort(
                    traderID,
                    JsonUtil.clone(trader.assort)
                );
            }

            trader.base.nextResupply = TraderHelper.getNextUpdateTimestamp(
                trader.base._id
            );
            DatabaseServer.getTables().traders[trader.base._id].base =
                trader.base;
        }
    }

    /**
     * Runs when onUpdate is fired
     * If current time is > nextResupply(expire) time of trader, refresh traders assorts and
     * @returns has run
     */
    static update()
    {
        for (const traderId in DatabaseServer.getTables().traders)
        {
            const trader = DatabaseServer.getTables().traders[traderId];

            // trader needs to be refreshed
            if (TraderAssortHelper.traderAssortsHaveExpired(traderId))
            {
                TraderAssortHelper.resetExpiredTrader(trader);
            }
        }

        return true;
    }

    /**
     * Return an array of all traders
     * @param sessionID Session id
     * @returns array if ITraderBase objects
     */
    static getAllTraders(sessionID)
    {
        const traders = [];
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        for (const traderID in DatabaseServer.getTables().traders)
        {
            if (
                DatabaseServer.getTables().traders[traderID].base._id ===
                "ragfair"
            )
            {
                continue;
            }

            traders.push(TraderHelper.getTrader(traderID, sessionID));

            if (pmcData.Info)
            {
                TraderHelper.lvlUp(traderID, sessionID);
            }
        }

        return traders;
    }

    static getTrader(sessionID, traderID)
    {
        return TraderHelper.getTrader(sessionID, traderID);
    }

    static getAssort(sessionId, traderId)
    {
        return TraderAssortHelper.getAssort(sessionId, traderId);
    }

    static getPurchasesData(sessionID, traderID)
    {
        return TraderHelper.getPurchasesData(traderID, sessionID);
    }
}

module.exports = TraderController;

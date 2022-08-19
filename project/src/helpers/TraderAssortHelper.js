"use strict";

require("../Lib.js");

class TraderAssortHelper
{
    /**
     * Get a traders assorts
     * Can be used for returning ragfair / fence assorts
     * Filter out assorts not unlocked due to level OR quest completion
     * @param sessionId session id
     * @param traderId traders id
     * @returns a traders' assorts
     */
    static getAssort(sessionId, traderId)
    {
        // Special case for getting ragfair items as they're dynamically generated
        if (traderId === "ragfair")
        {
            return TraderAssortHelper.getRagfairDataAsTraderAssort();
        }

        const trader = JsonUtil.clone(
            DatabaseServer.getTables().traders[traderId]
        );
        const pmcProfile = ProfileHelper.getPmcProfile(sessionId);

        // TODO: move into update() method - currently missing SessionId, cant pass pmcProfile to function without it
        if (traderId === Traders.FENCE)
        {
            TraderAssortHelper.refreshFenceAssortIfExpired(pmcProfile);

            return FenceService.getFenceAssorts();
        }

        // Strip assorts player should not see yet
        trader.assort = AssortHelper.stripLockedLoyaltyAssort(
            pmcProfile,
            traderId,
            trader.assort
        );
        trader.assort = AssortHelper.stripLockedQuestAssort(
            pmcProfile,
            traderId,
            trader.assort
        );

        if (TraderConfig.traderPriceMultipler !== 1)
        {
            TraderAssortHelper.multiplyItemPricesByConfigMultipler(
                trader.assort
            );
        }

        // Append nextResupply value to assorts so client knows when refresh is occuring
        trader.assort.nextResupply = trader.base.nextResupply;

        return trader.assort;
    }

    /**
     * if the fence assorts have expired, re-generate them
     * @param pmcProfile Players profile
     */
    static refreshFenceAssortIfExpired(pmcProfile)
    {
        const trader = DatabaseServer.getTables().traders[Traders.FENCE];

        // Generate fence assorts if fence has 0 items - happens on first visit
        if (FenceService.getOfferCount() === 0)
        {
            FenceService.generateFenceAssortCache(pmcProfile);
        }

        if (TraderAssortHelper.traderAssortsHaveExpired(Traders.FENCE))
        {
            FenceService.updateFenceOffers(pmcProfile);

            trader.base.nextResupply = TraderHelper.getNextUpdateTimestamp(
                Traders.FENCE
            );
        }
    }

    /**
     * Reset a traders assorts and move nextResupply value to future
     * Flag trader as needing a flea offer reset to be picked up by flea update() function
     * @param trader trader details to alter
     */
    static resetExpiredTrader(trader)
    {
        trader.assort.items = TraderAssortHelper.getPristineTraderAssorts(
            trader.base._id
        );

        // Update resupply value to next timestamp
        trader.base.nextResupply = TraderHelper.getNextUpdateTimestamp(
            trader.base._id
        );

        // Flag a refresh is needed so ragfair update() will pick it up
        trader.base.refreshTraderRagfairOffers = true;
    }

    /**
     * Does the supplied trader need its assorts refreshed
     * @param traderID Trader to check
     * @returns true they need refreshing
     */
    static traderAssortsHaveExpired(traderID)
    {
        const time = TimeUtil.getTimestamp();
        const trader = DatabaseServer.getTables().traders[traderID];

        return trader.base.nextResupply <= time;
    }

    /**
     * Iterate over all assorts barter_scheme values, find barters selling for money and multiply by multipler in config
     * @param traderAssort Assorts to multiple price of
     */
    static multiplyItemPricesByConfigMultipler(traderAssort)
    {
        if (
            !TraderConfig.traderPriceMultipler ||
            TraderConfig.traderPriceMultipler <= 0
        )
        {
            TraderConfig.traderPriceMultipler = 0.01;
            Logger.warning(
                "traderPriceMultipler was 0, this is invalid, setting to 0.01"
            );
        }

        for (const assortId in traderAssort.barter_scheme)
        {
            const schemeDetails = traderAssort.barter_scheme[assortId][0];
            if (
                schemeDetails.length === 1 &&
                PaymentHelper.isMoneyTpl(schemeDetails[0]._tpl)
            )
            {
                schemeDetails[0].count = Math.ceil(
                    schemeDetails[0].count * TraderConfig.traderPriceMultipler
                );
            }
        }
    }

    /**
     * Get an array of pristine trader items prior to any alteration by player (as they were on server start)
     * @param traderId trader id
     * @returns array of Items
     */
    static getPristineTraderAssorts(traderId)
    {
        return JsonUtil.clone(
            TraderAssortService.getPristineTraderAssort(traderId).items
        );
    }

    /**
     * Returns generated ragfair offers in a trader assort format
     * @returns Trader assort object
     */
    static getRagfairDataAsTraderAssort()
    {
        return {
            items: RagfairAssortGenerator.getAssortItems(),
            barter_scheme: {},
            loyal_level_items: {},
            nextResupply: null,
        };
    }
}

module.exports = TraderAssortHelper;

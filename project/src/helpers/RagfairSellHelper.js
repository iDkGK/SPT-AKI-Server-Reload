"use strict";

require("../Lib.js");

class RagfairSellHelper
{
    static calculateSellChance(
        baseChancePercent,
        offerPriceRub,
        playerListedPriceRub
    )
    {
        const multiplier =
            playerListedPriceRub > offerPriceRub
                ? RagfairConfig.sell.chance.overprices
                : playerListedPriceRub < offerPriceRub
                    ? RagfairConfig.sell.chance.underpriced
                    : 1;

        return Math.round(
            baseChancePercent *
                ((offerPriceRub / playerListedPriceRub) * multiplier)
        );
    }

    /**
     * Determine if the offer being listed will be sold
     * @param sellChancePercent chance item will sell
     * @param itemSellCount count of items to sell
     * @returns Array of purchases of item(s) lsited
     */
    static rollForSale(sellChancePercent, itemSellCount)
    {
        const startTime = TimeUtil.getTimestamp();
        const endTime =
            startTime +
            TimeUtil.getHoursAsSeconds(RagfairConfig.sell.simulatedSellHours);
        const chance = 100 - Math.min(Math.max(sellChancePercent, 0), 100);
        let sellTime = startTime;
        let remainingCount = itemSellCount;
        const result = [];

        // Avoid rolling for NaN sellChance
        sellChancePercent = sellChancePercent || RagfairConfig.sell.chance.base;

        Logger.debug(
            `Rolling for sell ${itemSellCount} items (chance: ${sellChancePercent})`
        );

        while (remainingCount > 0 && sellTime < endTime)
        {
            sellTime += Math.max(
                Math.round((chance / 100) * RagfairConfig.sell.time.max * 60),
                RagfairConfig.sell.time.min * 60
            );

            if (RandomUtil.getInt(0, 99) < sellChancePercent)
            {
                const boughtAmount = RandomUtil.getInt(1, remainingCount);

                result.push({
                    sellTime: sellTime,
                    amount: boughtAmount,
                });

                remainingCount -= boughtAmount;
            }
        }

        return result;
    }
}

module.exports = RagfairSellHelper;

"use strict";

class TraderHelper
{
    static getTrader(traderID, sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const trader = DatabaseServer.getTables().traders[traderID].base;

        if (!("TradersInfo" in pmcData))
        {
            // pmc profile wiped
            return trader;
        }

        if (!(traderID in pmcData.TradersInfo))
        {
            // trader doesn't exist in profile
            TraderHelper.resetTrader(sessionID, traderID);
            TraderHelper.lvlUp(traderID, sessionID);
        }

        return trader;
    }

    static getTraderAssortsById(traderId)
    {
        return traderId === Traders.FENCE
            ? FenceService.getFenceAssorts()
            : DatabaseServer.getTables().traders[traderId].assort;
    }

    /**
     * Reset a profiles trader data back to its initial state as seen by a level 1 player
     * Does NOT take into account different profile levels
     * @param sessionID session id
     * @param traderID trader id to reset
     */
    static resetTrader(sessionID, traderID)
    {
        const account = SaveServer.getProfile(sessionID);
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const rawProfileTemplate =
            DatabaseServer.getTables().templates.profiles[account.info.edition][
                pmcData.Info.Side.toLowerCase()
            ].trader;

        pmcData.TradersInfo[traderID] = {
            loyaltyLevel: rawProfileTemplate.initialLoyaltyLevel,
            salesSum: rawProfileTemplate.initialSalesSum,
            standing: rawProfileTemplate.initialStanding,
            nextResupply:
                DatabaseServer.getTables().traders[traderID].base.nextResupply,
            unlocked:
                DatabaseServer.getTables().traders[traderID].base
                    .unlockedByDefault,
        };

        if (traderID === Traders.JAEGER)
        {
            pmcData.TradersInfo[traderID].unlocked =
                rawProfileTemplate.jaegerUnlocked;
        }
    }

    /**
     * Alter a traders unlocked status
     * @param traderID Trader to alter
     * @param status New status to use
     * @param sessionID Session id
     */
    static setTraderUnlockedState(traderID, status, sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        pmcData.TradersInfo[traderID].unlocked = status;
    }

    /**
     * Get a list of items and their prices from player inventory that can be sold to a trader
     * @param traderID trader id being traded with
     * @param sessionID session id
     * @returns IBarterScheme[][]
     */
    static getPurchasesData(traderID, sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const traderBase = DatabaseServer.getTables().traders[traderID].base;
        const buyPriceCoefficient = TraderHelper.getLoyaltyLevel(
            traderBase._id,
            pmcData
        ).buy_price_coef;
        const fenceLevel = FenceService.getFenceInfo(pmcData);
        const currencyTpl = PaymentHelper.getCurrency(traderBase.currency);
        const output = {};

        // Iterate over player inventory items
        for (const item of pmcData.Inventory.items)
        {
            if (
                TraderHelper.isItemUnSellableToTrader(
                    pmcData,
                    item,
                    traderBase.sell_category
                )
            )
            {
                // Skip item if trader cant buy
                continue;
            }

            if (
                TraderHelper.isWeaponAndBelowTraderBuyDurability(
                    traderBase._id,
                    item
                )
            )
            {
                continue;
            }

            const itemPriceTotal = TraderHelper.getAdjustedItemPrice(
                pmcData,
                item,
                buyPriceCoefficient,
                fenceLevel,
                traderBase,
                currencyTpl
            );
            const barterDetails = {
                count: parseInt(itemPriceTotal.toFixed(0)),
                _tpl: currencyTpl,
            };
            output[item._id] = [[barterDetails]];
        }

        return output;
    }

    /**
     * Should item be skipped when selling to trader according to its sell categories and other checks
     * @param pmcData
     * @param item
     * @param sellCategory
     * @returns true if should NOT be sold to trader
     */
    static isItemUnSellableToTrader(pmcData, item, sellCategory)
    {
        return (
            item._id === pmcData.Inventory.equipment ||
            item._id === pmcData.Inventory.stash ||
            item._id === pmcData.Inventory.questRaidItems ||
            item._id === pmcData.Inventory.questStashItems ||
            ItemHelper.isNotSellable(item._tpl) ||
            TraderHelper.traderFilter(sellCategory, item._tpl) === false
        );
    }

    /**
     * Can this weapon be sold to a trader with its current durabiltiy level
     * @param traderID
     * @param item
     * @returns boolean
     */
    static isWeaponAndBelowTraderBuyDurability(traderID, item)
    {
        return (
            "upd" in item &&
            "Repairable" in item.upd && // has durability
            "FireMode" in item.upd && // weapon
            item.upd.Repairable.Durability <
                TraderConfig.minDurabilityForSale &&
            traderID !== Traders.FENCE
        );
    }

    /**
     * Get the price of an item and all of its attached children
     * Take into account bonuses/adjsutments e.g. discounts
     * @param pmcData profile data
     * @param item item to calculate price of
     * @param buyPriceCoefficient
     * @param fenceInfo fence data
     * @param traderBase trader details
     * @param currencyTpl Currency to get price as
     * @returns price of item + children
     */
    static getAdjustedItemPrice(
        pmcData,
        item,
        buyPriceCoefficient,
        fenceInfo,
        traderBase,
        currencyTpl
    )
    {
        // find all child of the item (including itself) and sum the price
        let price = TraderHelper.getRawItemPrice(pmcData, item);

        // dogtag calculation
        if (
            "upd" in item &&
            "Dogtag" in item.upd &&
            ItemHelper.isDogtag(item._tpl)
        )
        {
            price *= item.upd.Dogtag.Level;
        }

        // meds & repairable calculation
        price *= ItemHelper.getItemQualityModifier(item);

        // Scav karma
        const discount = TraderHelper.getTraderDiscount(
            traderBase,
            buyPriceCoefficient,
            fenceInfo,
            traderBase._id
        );
        if (discount > 0)
        {
            price -= (discount / 100) * price;
        }

        price = HandbookHelper.fromRUB(price, currencyTpl);
        price = price > 0 ? price : 1;

        return price;
    }

    /**
     * Get the raw price of item+child items from handbook without any modification
     * @param pmcData profile data
     * @param item item to calculate price of
     * @returns price as number
     */
    static getRawItemPrice(pmcData, item)
    {
        let price = 0;
        for (const childItem of ItemHelper.findAndReturnChildrenAsItems(
            pmcData.Inventory.items,
            item._id
        ))
        {
            const handbookItem =
                DatabaseServer.getTables().templates.handbook.Items.find(i =>
                {
                    return childItem._tpl === i.Id;
                });
            const count =
                "upd" in childItem && "StackObjectsCount" in childItem.upd
                    ? childItem.upd.StackObjectsCount
                    : 1;

            price += !handbookItem ? 1 : handbookItem.Price * count;
        }

        return price;
    }

    static getTraderDiscount(trader, buyPriceCoefficient, fenceInfo, traderID)
    {
        let discount = trader.discount + buyPriceCoefficient;
        if (
            traderID ===
            DatabaseServer.getTables().globals.config.FenceSettings.FenceId
        )
        {
            discount *= fenceInfo.PriceModifier;
        }

        return discount;
    }

    /**
     * Add standing to a trader and level them up if exp goes over level threshold
     * @param sessionID Session id
     * @param traderId traders id
     * @param standingToAdd Standing value to add to trader
     */
    static addStandingToTrader(sessionID, traderId, standingToAdd)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        pmcData.TradersInfo[traderId].standing += standingToAdd;

        if (pmcData.TradersInfo[traderId].standing < 0)
        {
            pmcData.TradersInfo[traderId].standing = 0;
        }

        TraderHelper.lvlUp(traderId, sessionID);
    }

    /**
     * Calculate traders level based on exp amount and increments level if over threshold
     * @param traderID trader to process
     * @param sessionID session id
     */
    static lvlUp(traderID, sessionID)
    {
        const loyaltyLevels =
            DatabaseServer.getTables().traders[traderID].base.loyaltyLevels;
        const pmcData = ProfileHelper.getPmcProfile(sessionID);

        // level up player
        pmcData.Info.Level = PlayerService.calculateLevel(pmcData);

        // level up traders
        let targetLevel = 0;

        // round standing to 2 decimal places to address floating point inaccuracies
        pmcData.TradersInfo[traderID].standing =
            Math.round(pmcData.TradersInfo[traderID].standing * 100) / 100;

        for (const level in loyaltyLevels)
        {
            const loyalty = loyaltyLevels[level];

            if (
                loyalty.minLevel <= pmcData.Info.Level &&
                loyalty.minSalesSum <= pmcData.TradersInfo[traderID].salesSum &&
                loyalty.minStanding <= pmcData.TradersInfo[traderID].standing &&
                targetLevel < 4
            )
            {
                // level reached
                targetLevel++;
            }
        }

        // set level
        pmcData.TradersInfo[traderID].loyaltyLevel = targetLevel;
    }

    /**
     * Get the next update timestamp for a trader
     * @param traderID Trader to look up update value for
     * @returns future timestamp
     */
    static getNextUpdateTimestamp(traderID)
    {
        const time = TimeUtil.getTimestamp();
        const updateSeconds = TraderHelper.getTraderUpdateSeconds(traderID);
        return time + updateSeconds;
    }

    /**
     * Get the reset time between trader assort refreshes in seconds
     * @param traderId Trader to look up
     * @returns Time in seconds
     */
    static getTraderUpdateSeconds(traderId)
    {
        const traderDetails = TraderConfig.updateTime.find(
            x => x.traderId === traderId
        );
        if (!traderDetails)
        {
            Logger.warning(
                `trader with ID ${traderId} not found, generating temp entry with default refresh time of ${TraderConfig.updateTimeDefault}`
            );
            TraderConfig.updateTime.push(
                // create temporary entry to prevent logger spam
                {
                    traderId: traderId,
                    seconds: TraderConfig.updateTimeDefault,
                }
            );
        }
        else
        {
            return traderDetails.seconds;
        }
    }

    /**
     * check if an item is allowed to be sold to a trader
     * @param traderFilters array of allowed categories
     * @param tplToCheck itemTpl of inventory
     * @returns boolean
     */
    static traderFilter(traderFilters, tplToCheck)
    {
        for (const filter of traderFilters)
        {
            for (const iaaaaa of HandbookHelper.templatesWithParent(filter))
            {
                if (iaaaaa === tplToCheck)
                {
                    return true;
                }
            }

            for (const subCat of HandbookHelper.childrenCategories(filter))
            {
                for (const itemFromSubcateg of HandbookHelper.templatesWithParent(
                    subCat
                ))
                {
                    if (itemFromSubcateg === tplToCheck)
                    {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    static getLoyaltyLevel(traderID, pmcData)
    {
        const trader = DatabaseServer.getTables().traders[traderID].base;
        let loyaltyLevel = pmcData.TradersInfo[traderID].loyaltyLevel;

        if (!loyaltyLevel || loyaltyLevel < 1)
        {
            loyaltyLevel = 1;
        }

        if (loyaltyLevel > trader.loyaltyLevels.length)
        {
            loyaltyLevel = trader.loyaltyLevels.length;
        }

        return trader.loyaltyLevels[loyaltyLevel - 1];
    }
}

module.exports = TraderHelper;

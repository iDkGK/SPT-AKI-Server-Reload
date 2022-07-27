"use strict";

class TraderHelper
{
    static pristineTraderAssorts = {};

    static get TRADER()
    {
        return {
            Prapor: "54cb50c76803fa8b248b4571",
            Therapist: "54cb57776803fa99248b456e",
            Fence: "579dc571d53a0658a154fbec",
            Skier: "58330581ace78e27b8b10cee",
            Peacekeeper: "5935c25fb3acc3127c3d8cd9",
            Mechanic: "5a7c2eca46aef81a7ca2145d",
            Ragman: "5ac3b934156ae10c4430e83c",
            Jaeger: "5c0647fdd443bc2504c2d371",
        };
    }

    static getTrader(traderID, sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const trader = DatabaseServer.tables.traders[traderID].base;
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

    static getPristineTraderAssort(traderId)
    {
        return TraderHelper.pristineTraderAssorts[traderId];
    }

    static setPristineTraderAssort(traderId, assort)
    {
        TraderHelper.pristineTraderAssorts[traderId] = assort;
    }

    static getTraderAssortsById(traderId)
    {
        return traderId === TraderHelper.TRADER.Fence
            ? FenceService.getFenceAssorts()
            : DatabaseServer.tables.traders[traderId].assort;
    }

    static resetTrader(sessionID, traderID)
    {
        const account = LauncherController.find(sessionID);
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const traderWipe =
            DatabaseServer.tables.templates.profiles[account.edition][
                pmcData.Info.Side.toLowerCase()
            ].trader;
        pmcData.TradersInfo[traderID] = {
            loyaltyLevel: 1,
            salesSum: traderWipe.initialSalesSum,
            standing: traderWipe.initialStanding,
            nextResupply:
                DatabaseServer.tables.traders[traderID].base.nextResupply,
            unlocked:
                DatabaseServer.tables.traders[traderID].base.unlockedByDefault,
        };
    }

    static changeTraderDisplay(traderID, status, sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        pmcData.TradersInfo[traderID].unlocked = status;
    }

    static lvlUp(traderID, sessionID)
    {
        const loyaltyLevels =
            DatabaseServer.tables.traders[traderID].base.loyaltyLevels;
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

    static stripLoyaltyAssort(sessionId, traderId, assort)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionId);
        // assort does not always contain loyal_level_items
        if (!assort.loyal_level_items)
        {
            Logger.warning(
                `stripQuestAssort: Assort for Trader ${traderId} does't contain "loyal_level_items"`
            );
        }
        else
        {
            for (const itemId in assort.loyal_level_items)
            {
                if (
                    assort.loyal_level_items[itemId] >
                    pmcData.TradersInfo[traderId].loyaltyLevel
                )
                {
                    assort = TraderHelper.removeItemFromAssort(assort, itemId);
                }
            }
        }
        return assort;
    }

    static stripQuestAssort(sessionId, traderId, assort)
    {
        const questassort = DatabaseServer.tables.traders[traderId].questassort;
        const pmcData = ProfileHelper.getPmcProfile(sessionId);
        // assort does not always contain loyal_level_items
        if (!assort.loyal_level_items)
        {
            Logger.warning(
                `stripQuestAssort: Assort for Trader ${traderId} does't contain "loyal_level_items"`
            );
        }
        else
        {
            for (const assortId in assort.loyal_level_items)
            {
                if (
                    assortId in questassort.started &&
                    QuestController.questStatus(
                        pmcData,
                        questassort.started[assortId]
                    ) !== "Started"
                )
                {
                    assort = TraderHelper.removeItemFromAssort(
                        assort,
                        assortId
                    );
                }

                if (
                    assortId in questassort.success &&
                    QuestController.questStatus(
                        pmcData,
                        questassort.success[assortId]
                    ) !== "Success"
                )
                {
                    assort = TraderHelper.removeItemFromAssort(
                        assort,
                        assortId
                    );
                }

                if (
                    assortId in questassort.fail &&
                    QuestController.questStatus(
                        pmcData,
                        questassort.fail[assortId]
                    ) !== "Fail"
                )
                {
                    assort = TraderHelper.removeItemFromAssort(
                        assort,
                        assortId
                    );
                }
            }
        }
        return assort;
    }

    // delete assort keys
    static removeItemFromAssort(assort, itemID)
    {
        const ids_toremove = ItemHelper.findAndReturnChildrenByItems(
            assort.items,
            itemID
        );

        delete assort.barter_scheme[itemID];
        delete assort.loyal_level_items[itemID];

        for (const i in ids_toremove)
        {
            for (const a in assort.items)
            {
                if (assort.items[a]._id === ids_toremove[i])
                {
                    assort.items.splice(parseInt(a), 1);
                }
            }
        }

        return assort;
    }

    /*
        check if an item is allowed to be sold to a trader
        input : array of allowed categories, itemTpl of inventory
        output : boolean
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

            for (const subcateg of HandbookHelper.childrenCategories(filter))
            {
                for (const itemFromSubcateg of HandbookHelper.templatesWithParent(
                    subcateg
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
        const trader = DatabaseServer.tables.traders[traderID].base;
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

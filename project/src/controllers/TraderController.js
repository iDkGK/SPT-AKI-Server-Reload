"use strict";

require("../Lib.js");

class TraderController
{
    static fenceAssort = undefined;
    static pristineTraderAssorts = {};

    static load()
    {
        TraderController.updateTraders();
    }

    static getTrader(traderID, sessionID)
    {
        const pmcData = ProfileController.getPmcProfile(sessionID);
        const trader = DatabaseServer.tables.traders[traderID].base;

        if (!("TradersInfo" in pmcData))
        {
            // pmc profile wiped
            return trader;
        }

        if (!(traderID in pmcData.TradersInfo))
        {
            // trader doesn't exist in profile
            ProfileController.resetTrader(sessionID, traderID);
            TraderController.lvlUp(traderID, sessionID);
        }

        return trader;
    }

    static changeTraderDisplay(traderID, status, sessionID)
    {
        const pmcData = ProfileController.getPmcProfile(sessionID);
        pmcData.TradersInfo[traderID].unlocked = status;
    }

    static getAllTraders(sessionID)
    {
        const traders = [];
        const pmcData = ProfileController.getPmcProfile(sessionID);
        for (const traderID in DatabaseServer.tables.traders)
        {
            if (DatabaseServer.tables.traders[traderID].base._id === "ragfair")
            {
                continue;
            }

            traders.push(TraderController.getTrader(traderID, sessionID));

            if (pmcData.Info)
            {
                TraderController.lvlUp(traderID, sessionID);
            }
        }

        return traders;
    }

    static lvlUp(traderID, sessionID)
    {
        const loyaltyLevels = DatabaseServer.tables.traders[traderID].base.loyaltyLevels;
        const pmcData = ProfileController.getPmcProfile(sessionID);

        // level up player
        pmcData.Info.Level = PlayerController.calculateLevel(pmcData);

        // level up traders
        let targetLevel = 0;

        // round standing to 2 decimal places to address floating point inaccuracies
        pmcData.TradersInfo[traderID].standing = Math.round(pmcData.TradersInfo[traderID].standing * 100) / 100;

        for (const level in loyaltyLevels)
        {
            const loyalty = loyaltyLevels[level];

            if ((loyalty.minLevel <= pmcData.Info.Level
                && loyalty.minSalesSum <= pmcData.TradersInfo[traderID].salesSum
                && loyalty.minStanding <= pmcData.TradersInfo[traderID].standing)
                && targetLevel < 4)
            {
                // level reached
                targetLevel++;
            }
        }

        // set level
        pmcData.TradersInfo[traderID].loyaltyLevel = targetLevel;
    }

    static updateTraders()
    {
        const time = TimeUtil.getTimestamp();

        for (const traderID in DatabaseServer.tables.traders)
        {
            const updateSeconds = TraderController.getTraderUpdateSeconds(traderID);
            const nextUpdateTimestamp = time + updateSeconds;

            const trader = DatabaseServer.tables.traders[traderID];
            const traderBase = trader.base;

            // Create dict of trader assorts on server start
            if (!TraderController.pristineTraderAssorts[traderID])
            {
                TraderController.pristineTraderAssorts[traderID] = JsonUtil.clone(trader.assort);
            }

            // No refresh needed, skip
            if (traderBase.nextResupply > time)
            {
                continue;
            }

            // The nextResupply variable is updated before the new assortment is requested by the client
            // This makes the nextResupply variable a "client-side" variable of sorts that is used to display
            // how much time the current assortment has left on the client screen
            // For the server we cant use that variable since its being updated before the getTrader() executes
            // hence the use of the variable refreshAssort writing war and peace over here lmao
            traderBase.refreshAssort = true;
            traderBase.nextResupply = nextUpdateTimestamp;
            DatabaseServer.tables.traders[traderID].base = traderBase;
        }

        return true;
    }

    static getTraderUpdateSeconds(traderId)
    {
        const traderDetails = TraderConfig.updateTime.find(x => x.traderId === traderId);
        if (!traderDetails)
        {
            Logger.warning(`trader with ID ${traderId} not found, falling back to default refresh time of ${TraderConfig.updateTimeDefault}`);
            return TraderConfig.updateTimeDefault;
        }

        return traderDetails.seconds;
    }

    static stripLoyaltyAssort(sessionId, traderId, assort)
    {
        const pmcData = ProfileController.getPmcProfile(sessionId);
        // assort does not always contain loyal_level_items
        if (!assort.loyal_level_items)
        {
            Logger.warning(`stripQuestAssort: Assort for Trader ${traderId} does't contain "loyal_level_items"`);
        }
        else
        {
            for (const itemId in assort.loyal_level_items)
            {
                if (assort.loyal_level_items[itemId] > pmcData.TradersInfo[traderId].loyaltyLevel)
                {
                    assort = TraderController.removeItemFromAssort(assort, itemId);
                }
            }
        }
        return assort;
    }

    static stripQuestAssort(sessionId, traderId, assort)
    {
        const questassort = DatabaseServer.tables.traders[traderId].questassort;
        const pmcData = ProfileController.getPmcProfile(sessionId);
        // assort does not always contain loyal_level_items
        if (!assort.loyal_level_items)
        {
            Logger.warning(`stripQuestAssort: Assort for Trader ${traderId} does't contain "loyal_level_items"`);
        }
        else
        {

            for (const assortId in assort.loyal_level_items)
            {
                if (assortId in questassort.started && QuestController.questStatus(pmcData, questassort.started[assortId]) !== "Started")
                {
                    assort = TraderController.removeItemFromAssort(assort, assortId);
                }

                if (assortId in questassort.success && QuestController.questStatus(pmcData, questassort.success[assortId]) !== "Success")
                {
                    assort = TraderController.removeItemFromAssort(assort, assortId);
                }

                if (assortId in questassort.fail && QuestController.questStatus(pmcData, questassort.fail[assortId]) !== "Fail")
                {
                    assort = TraderController.removeItemFromAssort(assort, assortId);
                }
            }
        }
        return assort;
    }

    static getAssort(sessionId, traderId)
    {
        // Special case for getting ragfair items as they're dynamically generated
        if (traderId === "ragfair")
        {
            return {
                "items": RagfairAssortGenerator.getAssortItems()
            };
        }

        const trader = DatabaseServer.tables.traders[traderId];
        const traderBase = trader.base;
        const assortsHaveExpired = traderBase.refreshAssort;

        if (traderId === TraderHelper.TRADER.Fence)
        {
            // By the time this method is called the nextResupply variable was already updated, so the old condition
            // of checking nextResupply < currentTime was always false. By using the refreshAssort we can make sure
            // that after the update happened this refresh was actually needed, and the next time the client requests
            // the update a freshly generated assortment is sent.
            if (!TraderController.fenceAssort || assortsHaveExpired)
            {
                Logger.info("Fence assortment is being generated");
                TraderController.fenceAssort = TraderController.generateFenceAssort(sessionId);
                RagfairServer.generateTraderOffers(traderId);
                // refreshAssort is reset back to false and we await again until the update() makes this condition happen
                traderBase.refreshAssort = false;
            }

            return TraderController.fenceAssort;
        }

        if (assortsHaveExpired)
        {
            // reset assorts back to default values
            trader.assort.items = JsonUtil.clone(TraderController.pristineTraderAssorts[traderId].items);
        }

        const traderData = JsonUtil.clone(trader);
        let result = traderData.assort;

        // Strip loyalty assorts not accessible to player
        result = TraderController.stripLoyaltyAssort(sessionId, traderId, result);

        // Strip quest assorts not accessible to player
        if ("questassort" in traderData)
        {
            result = TraderController.stripQuestAssort(sessionId, traderId, result);
        }

        if (assortsHaveExpired)
        {
            // Update resupply value to next timestamp
            result.nextResupply = traderData.base.nextResupply;

            // Must be disbled after refresh otherwise every purchase causes reset
            traderBase.refreshAssort = false;
        }

        return result;
    }

    static generateFenceAssort(sessionID)
    {
        const pmcData = ProfileController.getPmcProfile(sessionID);
        const fenceAssort = DatabaseServer.tables.traders[TraderHelper.TRADER.Fence].assort;
        const itemPresets = DatabaseServer.tables.globals.ItemPresets;
        const fenceAssortIds = Object.keys(fenceAssort.loyal_level_items);
        const result = {
            "items": [],
            "barter_scheme": {},
            "loyal_level_items": {}
        };

        let presetCount = 0;
        for (let i = 0; i < TraderConfig.fenceAssortSize; i++)
        {
            const itemID = fenceAssortIds[RandomUtil.getInt(0, fenceAssortIds.length - 1)];
            const price = HandbookController.getTemplatePrice(itemID);
            const itemIsPreset = PresetController.isPreset(itemID);

            if (price === 0 || (price === 1 && !itemIsPreset) || price === 100)
            {
                // don't allow "special" items
                i--;
                continue;
            }

            // it's an item
            if (!itemIsPreset)
            {
                // Skip items that are on fence ignore list
                if (TraderConfig.fenceItemIgnoreList.length > 0)
                {
                    if (ItemHelper.doesItemOrParentsIdMatch(itemID, TraderConfig.fenceItemIgnoreList)) // check blacklist against items parents
                    {
                        i--;
                        Logger.debug(`Fence: ignored item ${itemID}`);
                        continue;
                    }
                }

                // Skip quest items
                const itemDetails = ItemHelper.getItem(itemID);
                if (itemDetails[1]._props.QuestItem)
                {
                    continue;
                }

                const toPush = JsonUtil.clone(fenceAssort.items[fenceAssort.items.findIndex(i => i._id === itemID)]);

                toPush.upd.StackObjectsCount = 1;
                toPush.upd.BuyRestrictionCurrent = 0;
                toPush.upd.UnlimitedCount = false;

                toPush._id = HashUtil.generate();
                result.items.push(toPush);
                result.barter_scheme[toPush._id] = fenceAssort.barter_scheme[itemID];
                result.loyal_level_items[toPush._id] = fenceAssort.loyal_level_items[itemID];

                if (fenceAssort.barter_scheme[itemID])
                {
                    result.barter_scheme[toPush._id][0][0].count *= TraderController.getFenceInfo(pmcData).PriceModifier;
                }

                continue;
            }

            // it's itemPreset
            if (presetCount > TraderConfig.fenceMaxPresetsCount)
            {
                continue;
            }

            if (result.items.some(i => i.upd && i.upd.presetId === itemID))
            {
                // Duplicate preset, skip it
                continue;
            }

            const items = ItemHelper.replaceIDs(null, JsonUtil.clone(itemPresets[itemID]._items));
            let rub = 0;

            for (let i = 0; i < items.length; i++)
            {
                const mod = items[i];

                //build root Item info
                if (!("parentId" in mod))
                {
                    mod._id = items[0]._id;
                    mod.parentId = "hideout";
                    mod.slotId = "hideout";
                    mod.upd = {
                        "UnlimitedCount": false,
                        "StackObjectsCount": 1,
                        "presetId": itemID
                    };
                }
            }

            result.items.push.apply(result.items, items);

            // calculate preset price
            for (const it of items)
            {
                rub += HandbookController.getTemplatePrice(it._tpl);
            }

            result.barter_scheme[items[0]._id] = fenceAssort.barter_scheme[itemID];
            result.loyal_level_items[items[0]._id] = fenceAssort.loyal_level_items[itemID];

            if (fenceAssort.barter_scheme[itemID])
            {
                result.barter_scheme[items[0]._id][0][0].count = rub * TraderController.getFenceInfo(pmcData).PriceModifier * TraderConfig.fencePresetPriceMult;
            }

            presetCount++;
        }

        return result;
    }

    // delete assort keys
    static removeItemFromAssort(assort, itemID)
    {
        const ids_toremove = ItemHelper.findAndReturnChildrenByItems(assort.items, itemID);

        delete assort.barter_scheme[itemID];
        delete assort.loyal_level_items[itemID];

        for (const i in ids_toremove)
        {
            for (const a in assort.items)
            {
                if (assort.items[a]._id === ids_toremove[i])
                {
                    assort.items.splice(a, 1);
                }
            }
        }

        return assort;
    }

    static getPurchasesData(traderID, sessionID)
    {
        const pmcData = ProfileController.getPmcProfile(sessionID);
        const trader = DatabaseServer.tables.traders[traderID].base;
        const buy_price_coef = TraderController.getLoyaltyLevel(traderID, pmcData).buy_price_coef;
        const fenceInfo = TraderController.getFenceInfo(pmcData);
        const currency = PaymentController.getCurrency(trader.currency);
        const output = {};

        // get sellable items
        for (const item of pmcData.Inventory.items)
        {
            let price = 0;

            if (item._id === pmcData.Inventory.equipment
                || item._id === pmcData.Inventory.stash
                || item._id === pmcData.Inventory.questRaidItems
                || item._id === pmcData.Inventory.questStashItems
                || ItemHelper.isNotSellable(item._tpl)
                || TraderController.traderFilter(trader.sell_category, item._tpl) === false)
            {
                continue;
            }

            if ("upd" in item
                && "Repairable" in item.upd
                && "FireMode" in item.upd
                && item.upd.Repairable.Durability < TraderConfig.minDurabilityForSale
                && traderID !== TraderHelper.getTraderIdByName("fence"))
            {
                continue;
            }

            // find all child of the item (including itself) and sum the price
            for (const childItem of ItemHelper.findAndReturnChildrenAsItems(pmcData.Inventory.items, item._id))
            {
                const handbookItem = DatabaseServer.tables.templates.handbook.Items.find((i) =>
                {
                    return childItem._tpl === i.Id;
                });
                const count = ("upd" in childItem && "StackObjectsCount" in childItem.upd) ? childItem.upd.StackObjectsCount : 1;

                price += (!handbookItem) ? 1 : (handbookItem.Price * count);
            }

            // dogtag calculation
            if ("upd" in item && "Dogtag" in item.upd && ItemHelper.isDogtag(item._tpl))
            {
                price *= item.upd.Dogtag.Level;
            }

            // meds & repairable calculation
            price *= ItemHelper.getItemQualityModifier(item);

            // get real price
            let discount = trader.discount + buy_price_coef;

            // Scav karma
            if (traderID === DatabaseServer.tables.globals.config.FenceSettings.FenceId)
            {
                discount *= fenceInfo.PriceModifier;
            }

            if (discount > 0)
            {
                price -= (discount / 100) * price;
            }

            price = PaymentController.fromRUB(price, currency);
            price = (price > 0) ? price : 1;
            output[item._id] = [[{ "count": price.toFixed(0), "_tpl": currency }]];
        }

        return output;
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
            for (const iaaaaa of HandbookController.templatesWithParent(filter))
            {
                if (iaaaaa === tplToCheck)
                {
                    return true;
                }
            }

            for (const subcateg of HandbookController.childrenCategories(filter))
            {
                for (const itemFromSubcateg of HandbookController.templatesWithParent(subcateg))
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

    static getFenceInfo(pmcData)
    {
        const fenceSettings = DatabaseServer.tables.globals.config.FenceSettings;
        const pmcFenceInfo = pmcData.TradersInfo[fenceSettings.FenceId];

        if (!pmcFenceInfo)
        {
            return fenceSettings.Levels["0"];
        }

        const fenceLevels = (Object.keys(fenceSettings.Levels)).map((value) => Number.parseInt(value));
        const minLevel = Math.min(...fenceLevels);
        const maxLevel = Math.max(...fenceLevels);
        const pmcFenceLevel = Math.floor(pmcFenceInfo.standing);

        if (pmcFenceLevel < minLevel)
        {
            return fenceSettings.Levels[minLevel.toString()];
        }

        if (pmcFenceLevel > maxLevel)
        {
            return fenceSettings.Levels[maxLevel.toString()];
        }

        return fenceSettings.Levels[pmcFenceLevel.toString()];
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

module.exports = TraderController;

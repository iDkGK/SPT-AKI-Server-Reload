"use strict";

require("../Lib.js");

class TraderController
{
    static load()
    {
        TraderController.updateTraders();
    }

    static getTrader(traderID, sessionID)
    {
        return TraderHelper.getTrader(traderID, sessionID);
    }

    static getAllTraders(sessionID)
    {
        const traders = [];
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        for (const traderID in DatabaseServer.tables.traders)
        {
            if (
                DatabaseServer.tables.traders[traderID].base._id === "ragfair"
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

    static updateTraders()
    {
        const time = TimeUtil.getTimestamp();

        for (const traderID in DatabaseServer.tables.traders)
        {
            const updateSeconds = TraderHelper.getTraderUpdateSeconds(traderID);
            const nextUpdateTimestamp = time + updateSeconds;

            const trader = DatabaseServer.tables.traders[traderID];
            const traderBase = trader.base;

            // Create dict of trader assorts on server start
            if (!TraderHelper.getPristineTraderAssort(traderID))
            {
                TraderHelper.setPristineTraderAssort(
                    traderID,
                    JsonUtil.clone(trader.assort)
                );
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

    static getAssort(sessionId, traderId)
    {
        // Special case for getting ragfair items as they're dynamically generated
        if (traderId === "ragfair")
        {
            return {
                items: RagfairAssortGenerator.getAssortItems(),
                barter_scheme: {},
                loyal_level_items: {},
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
            if (!FenceService.getFenceAssort() || assortsHaveExpired)
            {
                Logger.info("Fence assortment is being generated");
                FenceService.generateFenceAssort(sessionId);
                RagfairServer.generateTraderOffers(traderId);
                // refreshAssort is reset back to false and we await again until the update() makes this condition happen
                traderBase.refreshAssort = false;
            }

            return FenceService.getFenceAssort();
        }

        if (assortsHaveExpired)
        {
            // reset assorts back to default values
            trader.assort.items = JsonUtil.clone(
                TraderHelper.getPristineTraderAssort(traderId).items
            );
        }

        const traderData = JsonUtil.clone(trader);
        let result = traderData.assort;

        // Strip loyalty assorts not accessible to player
        result = TraderHelper.stripLoyaltyAssort(sessionId, traderId, result);

        // Strip quest assorts not accessible to player
        if ("questassort" in traderData)
        {
            result = TraderHelper.stripQuestAssort(sessionId, traderId, result);
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

    static getPurchasesData(traderID, sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const trader = DatabaseServer.tables.traders[traderID].base;
        const buyPriceCoefficient = TraderHelper.getLoyaltyLevel(
            traderID,
            pmcData
        ).buy_price_coef;
        const fenceInfo = FenceService.getFenceInfo(pmcData);
        const currency = PaymentHelper.getCurrency(trader.currency);
        const output = {};

        // get sellable items
        for (const item of pmcData.Inventory.items)
        {
            let price = 0;

            if (
                item._id === pmcData.Inventory.equipment ||
                item._id === pmcData.Inventory.stash ||
                item._id === pmcData.Inventory.questRaidItems ||
                item._id === pmcData.Inventory.questStashItems ||
                ItemHelper.isNotSellable(item._tpl) ||
                TraderHelper.traderFilter(trader.sell_category, item._tpl) ===
                    false
            )
            {
                continue;
            }

            if (
                "upd" in item &&
                "Repairable" in item.upd &&
                "FireMode" in item.upd &&
                item.upd.Repairable.Durability <
                    TraderConfig.minDurabilityForSale &&
                traderID !== TraderHelper.TraderHelper.TRADER.Fence
            )
            {
                continue;
            }

            // find all child of the item (including itself) and sum the price
            for (const childItem of ItemHelper.findAndReturnChildrenAsItems(
                pmcData.Inventory.items,
                item._id
            ))
            {
                const handbookItem =
                    DatabaseServer.tables.templates.handbook.Items.find(i =>
                    {
                        return childItem._tpl === i.Id;
                    });
                const count =
                    "upd" in childItem && "StackObjectsCount" in childItem.upd
                        ? childItem.upd.StackObjectsCount
                        : 1;

                price += !handbookItem ? 1 : handbookItem.Price * count;
            }

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

            // get real price
            let discount = trader.discount + buyPriceCoefficient;

            // Scav karma
            if (
                traderID ===
                DatabaseServer.tables.globals.config.FenceSettings.FenceId
            )
            {
                discount *= fenceInfo.PriceModifier;
            }

            if (discount > 0)
            {
                price -= (discount / 100) * price;
            }

            price = HandbookHelper.fromRUB(price, currency);
            price = price > 0 ? price : 1;
            const barterDetails = {
                count: parseInt(price.toFixed(0)),
                _tpl: currency,
            };
            output[item._id] = [[barterDetails]];
        }

        return output;
    }
}

module.exports = TraderController;

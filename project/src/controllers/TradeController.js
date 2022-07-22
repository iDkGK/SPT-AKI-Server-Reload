"use strict";

require("../Lib.js");

class TradeController
{
    static buyItem(pmcData, body, sessionID, foundInRaid, upd)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        const newReq = {
            "items": [
                {
                    "item_id": body.item_id,
                    "count": body.count,
                }
            ],
            "tid": body.tid
        };
        const callback = () =>
        {
            output = PaymentController.payMoney(pmcData, body, sessionID, output);
            if (output.warnings.length > 0)
            {
                throw "Transaction failed";
            }

            TradeController.incrementAssortBuyCount(body.tid, body.item_id, body.count);

            Logger.debug(`Bought item: ${body.item_id}`);
        };

        return InventoryController.addItem(pmcData, newReq, output, sessionID, callback, foundInRaid, upd);
    }

    static incrementAssortBuyCount(traderId, assortId, itemCount)
    {
        const isFence = traderId === TraderHelper.TRADER.Fence;
        const traderAssorts = isFence
            ? TraderController.fenceAssort.items
            : DatabaseServer.tables.traders[traderId].assort.items;

        const relatedAssortIndex = traderAssorts.findIndex(i => i._id === assortId);

        if (isFence)
        {
            traderAssorts.splice(relatedAssortIndex, 1);
            return;
        }

        const itemToUpdate = traderAssorts[relatedAssortIndex];
        if (itemToUpdate)
        {
            itemToUpdate.upd.BuyRestrictionCurrent += itemCount;
        }
    }

    /**
     * Selling item to trader
     */
    static sellItem(pmcData, body, sessionID)
    {
        let money = 0;
        const prices = TraderController.getPurchasesData(body.tid, sessionID);
        let output = ItemEventRouter.getOutput(sessionID);

        for (const sellItem of body.items)
        {
            for (const item of pmcData.Inventory.items)
            {
                // profile inventory, look into it if item exist
                const isThereSpace = sellItem.id.search(" ");
                let checkID = sellItem.id;

                if (isThereSpace !== -1)
                {
                    checkID = checkID.substr(0, isThereSpace);
                }

                // item found
                if (item._id === checkID)
                {
                    Logger.debug(`Selling: ${checkID}`);

                    // remove item
                    output = InventoryController.removeItem(pmcData, checkID, sessionID, output);

                    // add money to return to the player
                    if (output !== "")
                    {
                        money += parseInt(prices[item._id][0][0].count);
                        break;
                    }

                    return "";
                }
            }
        }

        // get money the item]
        return PaymentController.getMoney(pmcData, money, body, output, sessionID);
    }

    // separate is that selling or buying
    static confirmTrading(pmcData, body, sessionID, foundInRaid = false, upd = null)
    {
        // buying
        if (body.type === "buy_from_trader")
        {
            return TradeController.buyItem(pmcData, body, sessionID, foundInRaid, upd);
        }

        // selling
        if (body.type === "sell_to_trader")
        {
            return TradeController.sellItem(pmcData, body, sessionID);
        }

        return "";
    }

    // Ragfair trading
    static confirmRagfairTrading(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);

        for (const offer of body.offers)
        {
            const data = RagfairServer.getOffer(offer.id);
            Logger.debug(JSON.stringify(offer, null, 2));

            pmcData = ProfileController.getPmcProfile(sessionID);
            body = {
                "Action": "TradingConfirm",
                "type": "buy_from_trader",
                "tid": (data.user.memberType !== 4) ? "ragfair" : data.user.id,
                "item_id": data.root,
                "count": offer.count,
                "scheme_id": 0,
                "scheme_items": offer.items
            };

            if (data.user.memberType !== 4)
            {
                // remove player item offer stack
                RagfairServer.removeOfferStack(data._id, offer.count);
            }

            output = TradeController.confirmTrading(pmcData, body, sessionID, false, data.items[0].upd);
        }

        return output;
    }
}

module.exports = TradeController;

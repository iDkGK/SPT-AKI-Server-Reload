"use strict";

require("../Lib.js");

class TradeController
{
    // separate is that selling or buying
    static confirmTrading(
        pmcData,
        body,
        sessionID,
        foundInRaid = false,
        upd = null
    )
    {
        // buying
        if (body.type === "buy_from_trader")
        {
            const buyData = body;
            return TradeController.buyItem(
                pmcData,
                buyData,
                sessionID,
                foundInRaid,
                upd
            );
        }

        // selling
        if (body.type === "sell_to_trader")
        {
            const sellData = body;
            return TradeController.sellItem(pmcData, sellData, sessionID);
        }

        return "";
    }

    static buyItem(pmcData, buyRequestData, sessionID, foundInRaid, upd)
    {
        const traderAssorts = TraderHelper.getTraderAssortsById(buyRequestData.tid).items;
        const assortBeingPurchased = traderAssorts.find(x => x._id === buyRequestData.item_id);
        const hasBuyRestrictions = ItemHelper.hasBuyRestrictions(assortBeingPurchased);
        // Ensure purchase does not exceed trader item limit
        if (hasBuyRestrictions)
        {
            TradeController.checkPurchaseIsWithinTraderItemLimit(assortBeingPurchased, buyRequestData.item_id, buyRequestData.count);
        }
        /// Pay for item
        output = PaymentService.payMoney(pmcData, buyRequestData, sessionID, output);
        const newReq = {
            items: [
                {
                    item_id: buyRequestData.item_id,
                    count: buyRequestData.count,
                },
            ],
            tid: buyRequestData.tid,
        };
        const callback = () =>
        {
            output = PaymentService.payMoney(pmcData, buyRequestData, sessionID, output);
            if (output.warnings.length > 0)
            {
                throw "Transaction failed";
            }

            if (buyRequestData.tid === TraderHelper.TRADER.Fence)
            {
                // Bought fence offer, remove from listing
                FenceService.removeFenceOffer(buyRequestData.item_id);
            }
            else
            {
                if (hasBuyRestrictions)
                {
                    TradeController.incrementAssortBuyCount(assortBeingPurchased, buyRequestData.count);
                }
            }
            Logger.debug(`Bought item: ${buyRequestData.item_id} from ${buyRequestData.tid}`);
        };

        return InventoryHelper.addItem(
            pmcData,
            newReq,
            output,
            sessionID,
            callback,
            foundInRaid,
            upd
        );
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
                    output = InventoryHelper.removeItem(
                        pmcData,
                        checkID,
                        sessionID,
                        output
                    );

                    // add money to return to the player
                    if (output.profileChanges !== null)
                    {
                        money += prices[item._id][0][0].count;
                        break;
                    }

                    return;
                }
            }
        }

        // get money the item
        return PaymentService.getMoney(pmcData, money, body, output, sessionID);
    }

    // Ragfair trading
    static confirmRagfairTrading(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);

        for (const offer of body.offers)
        {
            const fleaOffer = RagfairServer.getOffer(offer.id);
            Logger.debug(JSON.stringify(offer, null, 2));

            pmcData = ProfileHelper.getPmcProfile(sessionID);
            body = {
                Action: "TradingConfirm",
                type: "buy_from_trader",
                tid:
                    fleaOffer.user.memberType !==
                    RagfairServerHelper.memberCategory.trader
                        ? "ragfair"
                        : fleaOffer.user.id,
                item_id: fleaOffer.root,
                count: offer.count,
                scheme_id: 0,
                scheme_items: offer.items,
            };

            if (
                fleaOffer.user.memberType !==
                RagfairServerHelper.memberCategory.trader
            )
            {
                // remove player item offer stack
                RagfairServer.removeOfferStack(fleaOffer._id, offer.count);
            }

            output = TradeController.confirmTrading(
                pmcData,
                body,
                sessionID,
                false,
                fleaOffer.items[0].upd
            );
        }

        return output;
    }

    static incrementAssortBuyCount(assortBeingPurchased, itemsPurchasedCount)
    {
        assortBeingPurchased.upd.BuyRestrictionCurrent += itemsPurchasedCount;

        if (assortBeingPurchased.upd.BuyRestrictionCurrent === assortBeingPurchased.upd.BuyRestrictionMax)
        {
            //Hide flea offer when over purchase limit reached
            if (RagfairServer.doesOfferExist(assortBeingPurchased._id))
            {
                RagfairServer.hideOffer(assortBeingPurchased._id);
            }
            return;
        }

        if (assortBeingPurchased.upd.BuyRestrictionCurrent > assortBeingPurchased.upd.BuyRestrictionMax)
        {
            throw "Unable to purchase item, Purchase limit reached";
        }
    }

    static checkPurchaseIsWithinTraderItemLimit(assortBeingPurchased, assortId, count)
    {
        if ((assortBeingPurchased.upd.BuyRestrictionCurrent + count) > assortBeingPurchased.upd?.BuyRestrictionMax)
        {
            throw `Unable to purchase ${count} items, this would exceed your purchase limit of ${assortBeingPurchased.upd.BuyRestrictionMax} from the trader this refresh`;
        }
    }
}

module.exports = TradeController;

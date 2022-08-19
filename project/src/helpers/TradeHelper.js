"use strict";

require("../Lib.js");

class TradeHelper
{
    /**
     * Buy item from flea or trader
     * @param pmcData
     * @param buyRequestData data from client
     * @param sessionID
     * @param foundInRaid
     * @param upd optional item details used when buying from flea
     * @returns
     */
    static buyItem(pmcData, buyRequestData, sessionID, foundInRaid, upd)
    {
        let output = ItemEventRouter.getOutput(sessionID);

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
            let itemPurchased;
            if (buyRequestData.tid.toLocaleLowerCase() === "ragfair")
            {
                const allOffers = RagfairServer.getOffers();
                const offersWithItem = allOffers.find(
                    x => x.items[0]._id === buyRequestData.item_id
                );
                itemPurchased = offersWithItem.items[0];
            }
            else
            {
                const traderAssorts = TraderHelper.getTraderAssortsById(
                    buyRequestData.tid
                ).items;
                itemPurchased = traderAssorts.find(
                    x => x._id === buyRequestData.item_id
                );
            }

            const hasBuyRestrictions =
                ItemHelper.hasBuyRestrictions(itemPurchased);

            // Ensure purchase does not exceed trader item limit
            if (hasBuyRestrictions)
            {
                TradeHelper.checkPurchaseIsWithinTraderItemLimit(
                    itemPurchased,
                    buyRequestData.item_id,
                    buyRequestData.count
                );
            }

            /// Pay for item
            output = PaymentService.payMoney(
                pmcData,
                buyRequestData,
                sessionID,
                output
            );
            if (output.warnings.length > 0)
            {
                throw new Error(
                    `Transaction failed: ${output.warnings[0].errmsg}`
                );
            }

            if (buyRequestData.tid === Traders.FENCE)
            {
                // Bought fence offer, remove from listing
                FenceService.removeFenceOffer(buyRequestData.item_id);
            }
            else
            {
                if (hasBuyRestrictions)
                {
                    // Increment non-fence trader item buy count
                    TradeHelper.incrementAssortBuyCount(
                        itemPurchased,
                        buyRequestData.count
                    );
                }
            }

            Logger.debug(
                `Bought item: ${buyRequestData.item_id} from ${buyRequestData.tid}`
            );
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
     * Sell item to trader
     * @param pmcData
     * @param body
     * @param sessionID
     * @returns
     */
    static sellItem(pmcData, body, sessionID)
    {
        let money = 0;
        const prices = TraderHelper.getPurchasesData(body.tid, sessionID);
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

    static incrementAssortBuyCount(assortBeingPurchased, itemsPurchasedCount)
    {
        assortBeingPurchased.upd.BuyRestrictionCurrent += itemsPurchasedCount;

        if (
            assortBeingPurchased.upd.BuyRestrictionCurrent ===
            assortBeingPurchased.upd.BuyRestrictionMax
        )
        {
            //Hide flea offer when over purchase limit reached
            if (RagfairServer.doesOfferExist(assortBeingPurchased._id))
            {
                RagfairServer.hideOffer(assortBeingPurchased._id);
            }

            return;
        }

        if (
            assortBeingPurchased.upd.BuyRestrictionCurrent >
            assortBeingPurchased.upd.BuyRestrictionMax
        )
        {
            throw "Unable to purchase item, Purchase limit reached";
        }
    }

    static checkPurchaseIsWithinTraderItemLimit(
        assortBeingPurchased,
        assortId,
        count
    )
    {
        if (
            assortBeingPurchased.upd.BuyRestrictionCurrent + count >
            assortBeingPurchased.upd?.BuyRestrictionMax
        )
        {
            throw `Unable to purchase ${count} items, this would exceed your purchase limit of ${assortBeingPurchased.upd.BuyRestrictionMax} from the trader this refresh`;
        }
    }
}

module.exports = TradeHelper;

"use strict";

require("../Lib.js");

class TradeController
{
    static confirmTrading(
        pmcData,
        body,
        sessionID,
        foundInRaid = false,
        upd = undefined
    )
    {
        // buying
        if (body.type === "buy_from_trader")
        {
            const buyData = body;
            return TradeHelper.buyItem(
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
            return TradeHelper.sellItem(pmcData, sellData, sessionID);
        }

        return null;
    }

    // Ragfair trading
    static confirmRagfairTrading(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);

        for (const offer of body.offers)
        {
            const fleaOffer = RagfairServer.getOffer(offer.id);
            Logger.debug(JSON.stringify(offer, null, 2));

            const buyData = {
                Action: "TradingConfirm",
                type: "buy_from_trader",
                tid:
                    fleaOffer.user.memberType !== MemberCategory.TRADER
                        ? "ragfair"
                        : fleaOffer.user.id,
                item_id: fleaOffer.root,
                count: offer.count,
                scheme_id: 0,
                scheme_items: offer.items,
            };

            if (fleaOffer.user.memberType !== MemberCategory.TRADER)
            {
                // remove player item offer stack
                RagfairServer.removeOfferStack(fleaOffer._id, offer.count);
            }

            output = TradeController.confirmTrading(
                pmcData,
                buyData,
                sessionID,
                false,
                fleaOffer.items[0].upd
            );
        }

        return output;
    }
}

module.exports = TradeController;

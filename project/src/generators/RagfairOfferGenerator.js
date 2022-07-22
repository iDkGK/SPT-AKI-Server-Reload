"use strict";

require("../Lib.js");

class RagfairOfferGenerator
{
    static createOffer(userID, time, items, barterScheme, loyalLevel, price, sellInOnePiece = false)
    {
        const isTrader = RagfairServerHelper.isTrader(userID);
        const trader = DatabaseServer.tables.traders[(isTrader) ? userID : "ragfair"].base;

        const offer = {
            "_id": (isTrader) ? items[0]._id : HashUtil.generate(),
            "intId": 0,
            "user": {
                "id": RagfairOfferGenerator.getTraderId(userID),
                "memberType": (userID !== "ragfair") ? RagfairServerHelper.getMemberType(userID) : 0,
                "nickname": RagfairServerHelper.getNickname(userID),
                "rating": RagfairOfferGenerator.getRating(userID),
                "isRatingGrowing": RagfairOfferGenerator.getRatingGrowing(userID),
                "avatar": trader.avatar
            },
            "root": items[0]._id,
            "items": JsonUtil.clone(items),
            "requirements": barterScheme,
            "requirementsCost": price,
            "itemsCost": price,
            "summaryCost": price,
            "startTime": time,
            "endTime": RagfairOfferGenerator.getOfferEndTime(userID, time),
            "loyaltyLevel": loyalLevel,
            "sellInOnePiece": sellInOnePiece,
            "priority": false
        };

        return offer;
    }

    static getTraderId(userID)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            return SaveServer.profiles[userID].characters.pmc._id;
        }
        return userID;
    }

    static getRating(userID)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            // player offer
            return SaveServer.profiles[userID].characters.pmc.RagfairInfo.rating;
        }

        if (RagfairServerHelper.isTrader(userID))
        {
            // trader offer
            return 1;
        }

        // generated offer
        return RandomUtil.getFloat(RagfairConfig.dynamic.rating.min, RagfairConfig.dynamic.rating.max);
    }

    static getRatingGrowing(userID)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            // player offer
            return SaveServer.profiles[userID].characters.pmc.RagfairInfo.isRatingGrowing;
        }

        if (RagfairServerHelper.isTrader(userID))
        {
            // trader offer
            return true;
        }

        // generated offer
        return RandomUtil.getBool();
    }

    static getOfferEndTime(userID, time)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            // player offer
            return TimeUtil.getTimestamp() + Math.round(12 * 3600);
        }

        if (RagfairServerHelper.isTrader(userID))
        {
            // trader offer
            return DatabaseServer.tables.traders[userID].base.nextResupply;
        }

        // generated offer
        return Math.round(time + RandomUtil.getInt(RagfairConfig.dynamic.endTimeSeconds.min, RagfairConfig.dynamic.endTimeSeconds.max));
    }
}

module.exports = RagfairOfferGenerator;
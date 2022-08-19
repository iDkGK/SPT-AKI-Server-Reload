"use strict";

require("../Lib.js");

class RagfairRequiredItemsService
{
    static requiredItemsCache = {};

    static getRequiredItems(searchId)
    {
        return RagfairRequiredItemsService.requiredItemsCache[searchId] || [];
    }

    static buildRequiredItemTable()
    {
        const requiredItems = {};
        const getRequiredItems = (id) =>
        {
            if (!(id in requiredItems))
            {
                requiredItems[id] = new Set();
            }

            return requiredItems[id];
        };

        for (const offer of RagfairOfferService.getOffers())
        {
            for (const requirement of offer.requirements)
            {
                if (PaymentHelper.isMoneyTpl(requirement._tpl))
                {
                    // This would just be too noisy.
                    continue;
                }

                getRequiredItems(requirement._tpl).add(offer);
            }
        }

        RagfairRequiredItemsService.requiredItemsCache = requiredItems;
    }
}

module.exports = RagfairRequiredItemsService;
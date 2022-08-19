"use strict";

require("../Lib.js");

class RagfairServer
{
    static load()
    {
        RagfairPriceService.generateStaticPrices();
        RagfairPriceService.generateDynamicPrices();
        RagfairOfferGenerator.generateDynamicOffers();
        RagfairServer.update();
    }

    static update()
    {
        RagfairOfferService.expireStaleOffers();

        // Generate trader offers
        const traders = RagfairServer.getUpdateableTraders();
        for (const traderID of traders)
        {
            // Skip generating fence offers
            if (traderID === Traders.FENCE)
            {
                continue;
            }

            if (RagfairOfferService.traderOffersNeedRefreshing(traderID))
            {
                RagfairOfferGenerator.generateFleaOffersForTrader(traderID);
            }
        }

        // Regen expired offers when over threshold count
        if (
            RagfairOfferService.getExpiredOfferCount() >=
            RagfairConfig.dynamic.expiredOfferThreshold
        )
        {
            const expiredOffers = RagfairOfferService.getExpiredOffers();
            RagfairOfferGenerator.generateDynamicOffers(expiredOffers);

            // reset expired offers now we've genned them
            RagfairOfferService.resetExpiredOffers();
        }

        RagfairRequiredItemsService.buildRequiredItemTable();
    }

    /**
     * Get traders who need to be periodically refreshed
     * @returns string array of traders
     */
    static getUpdateableTraders()
    {
        return Object.keys(RagfairConfig.traders).filter(
            x => RagfairConfig.traders[x]
        );
    }

    static getAllCategories()
    {
        return RagfairCategoriesService.getAllCategories();
    }

    static getBespokeCategories(offers)
    {
        return RagfairCategoriesService.getBespokeCategories(offers);
    }

    /**
     * Disable/Hide an offer from flea
     * @param offerId
     */
    static hideOffer(offerId)
    {
        const offers = RagfairOfferService.getOffers();
        const offer = offers.find(x => x._id === offerId);

        if (!offer)
        {
            Logger.error(`hideItem() offerId ${offerId} not found`);
            return;
        }

        offer.locked = true;
    }

    static getOffer(offerID)
    {
        return RagfairOfferService.getOfferByOfferId(offerID);
    }

    static getOffers()
    {
        return RagfairOfferService.getOffers();
    }

    static removeOfferStack(offerID, amount)
    {
        return RagfairOfferService.removeOfferStack(offerID, amount);
    }

    static doesOfferExist(offerId)
    {
        return RagfairOfferService.doesOfferExist(offerId);
    }

    static addPlayerOffers()
    {
        RagfairOfferService.addPlayerOffers();
    }
}

module.exports = RagfairServer;

"use strict";

require("../Lib.js");

class RagfairOfferService
{
    static playerOffersLoaded = false;
    static expiredOffers = [];
    static offers = [];

    /**
     * Get all offers
     * @returns IRagfairOffer array
     */
    static getOffers()
    {
        return RagfairOfferService.offers;
    }

    static getOfferByOfferId(offerId)
    {
        return RagfairOfferService.offers.find(x => x._id === offerId);
    }

    static getOffersOfType(templateId)
    {
        return RagfairOfferService.offers.filter((offer) =>
        {
            return offer.items[0]._tpl === templateId;
        });
    }

    static addOffer(offer)
    {
        RagfairOfferService.offers.push(offer);
    }

    static addOfferToExpired(staleOffer)
    {
        RagfairOfferService.expiredOffers.push(staleOffer.items[0]);
    }

    static getExpiredOfferCount()
    {
        return RagfairOfferService.expiredOffers.length;
    }

    /**
      * Get an array of expired items not yet processed into new offers
      * @returns items that need to be turned into offers
      */
    static getExpiredOffers()
    {
        return RagfairOfferService.expiredOffers;
    }

    static resetExpiredOffers()
    {
        RagfairOfferService.expiredOffers = [];
    }

    /**
      * Does the offer exist on the ragfair
      * @param offerId offer id to check for
      * @returns offer exists - true
      */
    static doesOfferExist(offerId)
    {
        return RagfairOfferService.offers.some(x => x._id === offerId);
    }

    static removeOfferById(offerId)
    {
        const index = RagfairOfferService.offers.findIndex(o => o._id === offerId);
        RagfairOfferService.offers.splice(index, 1);
    }

    static removeOfferStack(offerID, amount)
    {
        // remove stack from offer
        for (const offer in RagfairOfferService.offers)
        {
            if (RagfairOfferService.offers[offer]._id === offerID)
            {
                // found offer
                RagfairOfferService.offers[offer].items[0].upd.StackObjectsCount -= amount;
                break;
            }
        }
    }

    static removeAllOffersByTrader(traderId)
    {
        RagfairOfferService.offers = RagfairOfferService.offers.filter((offer) =>
        {
            return offer.user.id !== traderId;
        });
    }

    /**
      * Do the trader offers on flea need to be refreshed
      * @param traderID Trader to check
      * @returns true if they do
      */
    static traderOffersNeedRefreshing(traderID)
    {
        const trader = DatabaseServer.getTables().traders[traderID];

        // No value, occurs when first run, trader offers need to be added to flea
        if (typeof trader.base.refreshTraderRagfairOffers !== "boolean")
        {
            trader.base.refreshTraderRagfairOffers = true;
        }

        return trader.base.refreshTraderRagfairOffers;
    }

    static addPlayerOffers()
    {
        if (!RagfairOfferService.playerOffersLoaded)
        {
            for (const sessionID in SaveServer.getProfiles())
            {
                const pmcData = SaveServer.getProfile(sessionID).characters.pmc;

                if (pmcData.RagfairInfo === undefined || pmcData.RagfairInfo.offers === undefined)
                {
                    // profile is wiped
                    continue;
                }

                const profileOffers = pmcData.RagfairInfo.offers;
                for (const offer of profileOffers)
                {
                    RagfairOfferService.addOffer(offer);
                }
            }
            RagfairOfferService.playerOffersLoaded = true;
        }
    }

    static expireStaleOffers()
    {
        const staleOffers = RagfairOfferService.getStaleOffers();

        for (const staleOfferIndex in staleOffers)
        {
            const offer = staleOffers[staleOfferIndex];
            RagfairOfferService.processStaleOffer(offer);
        }
    }

    /**
      * Get an array of stale offers that are still shown to player
      * @returns IRagfairOffer array
      */
    static getStaleOffers()
    {
        const time = TimeUtil.getTimestamp();
        const expiredOffers = [];

        for (const i in RagfairOfferService.offers)
        {
            const offer = RagfairOfferService.offers[i];

            if (RagfairOfferService.isStale(offer, time))
            {
                expiredOffers.push(offer);
            }
        }

        return expiredOffers;
    }

    static isStale(offer, time)
    {
        return offer.endTime < time || offer.items[0].upd.StackObjectsCount < 1;
    }

    static processStaleOffer(staleOffer)
    {
        const staleOfferUserId = staleOffer.user.id;
        const isTrader = RagfairServerHelper.isTrader(staleOfferUserId);
        const isPlayer = RagfairServerHelper.isPlayer(staleOfferUserId.replace(/^pmc/, ""));

        // handle trader offer
        if (isTrader)
        {
            // Will be handled by RagfairServer.update()
            return;
        }

        // handle dynamic offer
        if (!isTrader && !isPlayer)
        {
            // Dynamic offer
            RagfairOfferService.addOfferToExpired(staleOffer);
        }

        // handle player offer - items need returning/XP adjusting
        if (isPlayer)
        {
            // TODO: something feels wrong, func returns ItemEventRouterResponse but we dont pass it back to caller?
            RagfairOfferService.returnPlayerOffer(staleOffer);
        }

        // Reduce category count by 1 as offer is now stale and about to be removed
        RagfairCategoriesService.decrementCategory(staleOffer);

        // remove expired existing offer from global offers
        RagfairOfferService.removeOfferById(staleOffer._id);
    }

    static returnPlayerOffer(offer)
    {
        const pmcID = String(offer.user.id);
        const profile = ProfileHelper.getProfileByPmcId(pmcID);
        const sessionID = profile.aid;
        const offerIndex = profile.RagfairInfo.offers.findIndex(o => o._id === offer._id);

        profile.RagfairInfo.rating -= RagfairConfig.sell.reputation.loss;
        profile.RagfairInfo.isRatingGrowing = false;

        if (offerIndex === -1)
        {
            Logger.warning(`Could not find offer to remove with offerId -> ${offer._id}`);
            return HttpResponseUtil.appendErrorToOutput(ItemEventRouter.getOutput(sessionID), "Offer not found in profile");
        }

        if (offer.items[0].upd.StackObjectsCount > offer.items[0].upd.OriginalStackObjectsCount)
        {
            offer.items[0].upd.StackObjectsCount = offer.items[0].upd.OriginalStackObjectsCount;
        }
        delete offer.items[0].upd.OriginalStackObjectsCount;

        RagfairServerHelper.returnItems(profile.aid, offer.items);
        profile.RagfairInfo.offers.splice(offerIndex, 1);

        RagfairOfferService.removeOfferById(offer._id);

        return ItemEventRouter.getOutput(sessionID);
    }
}

module.exports = RagfairOfferService;
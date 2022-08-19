"use strict";

require("../Lib.js");

class RagfairOfferHelper
{
    static get goodSoldTemplate()
    {
        return "5bdac0b686f7743e1665e09e";
    }

    static getValidOffers(info, itemsToAdd, assorts, pmcProfile)
    {
        const offers = [];

        for (const offer of RagfairOfferService.getOffers())
        {
            if (
                RagfairOfferHelper.isDisplayableOffer(
                    info,
                    itemsToAdd,
                    assorts,
                    offer,
                    pmcProfile
                )
            )
            {
                offers.push(offer);
            }
        }

        return offers;
    }

    static getOffersForBuild(info, itemsToAdd, assorts, pmcProfile)
    {
        const offersMap = new Map();
        const offers = [];

        for (const offer of RagfairOfferService.getOffers())
        {
            if (
                RagfairOfferHelper.isDisplayableOffer(
                    info,
                    itemsToAdd,
                    assorts,
                    offer,
                    pmcProfile
                )
            )
            {
                const key = offer.items[0]._tpl;

                if (!offersMap.has(key))
                {
                    offersMap.set(key, []);
                }

                offersMap.get(key).push(offer);
            }
        }

        for (const tmpOffers of offersMap.values())
        {
            const offer = RagfairSortHelper.sortOffers(tmpOffers, 5, 0)[0];
            offers.push(offer);
        }

        return offers;
    }

    static processOffersOnProfile(sessionID)
    {
        const timestamp = TimeUtil.getTimestamp();

        const profileOffers = RagfairOfferHelper.getProfileOffers(sessionID);

        if (!profileOffers || !profileOffers.length)
        {
            return true;
        }

        for (const offer of profileOffers.values())
        {
            if (
                offer.sellResult &&
                offer.sellResult.length > 0 &&
                timestamp >= offer.sellResult[0].sellTime
            )
            {
                // Item sold
                let totalItemsCount = 1;
                let boughtAmount = 1;

                if (!offer.sellInOnePiece)
                {
                    totalItemsCount = offer.items.reduce(
                        (sum, item) => (sum += item.upd.StackObjectsCount),
                        0
                    );
                    boughtAmount = offer.sellResult[0].amount;
                }

                // Increase rating
                const profileRagfairInfo =
                    SaveServer.getProfile(sessionID).characters.pmc.RagfairInfo;
                profileRagfairInfo.rating +=
                    ((RagfairConfig.sell.reputation.gain * offer.summaryCost) /
                        totalItemsCount) *
                    boughtAmount;
                profileRagfairInfo.isRatingGrowing = true;

                RagfairOfferHelper.completeOffer(
                    sessionID,
                    offer,
                    boughtAmount
                );
                offer.sellResult.splice(0, 1);
            }
        }

        return true;
    }

    static getProfileOffers(sessionID)
    {
        const profile = ProfileHelper.getPmcProfile(sessionID);

        if (
            profile.RagfairInfo === undefined ||
            profile.RagfairInfo.offers === undefined
        )
        {
            return [];
        }

        return profile.RagfairInfo.offers;
    }

    static deleteOfferByOfferId(sessionID, offerId)
    {
        const profileRagfairInfo =
            SaveServer.getProfile(sessionID).characters.pmc.RagfairInfo;
        const index = profileRagfairInfo.offers.findIndex(
            o => o._id === offerId
        );
        profileRagfairInfo.offers.splice(index, 1);

        RagfairOfferService.removeOfferById(offerId);
    }

    static completeOffer(sessionID, offer, boughtAmount)
    {
        const itemTpl = offer.items[0]._tpl;
        let itemsToSend = [];

        if (
            offer.sellInOnePiece ||
            boughtAmount === offer.items[0].upd.StackObjectsCount
        )
        {
            RagfairOfferHelper.deleteOfferByOfferId(sessionID, offer._id);
        }
        else
        {
            offer.items[0].upd.StackObjectsCount -= boughtAmount;
            const rootItems = offer.items.filter(i => i.parentId === "hideout");
            rootItems.splice(0, 1);

            let removeCount = boughtAmount;
            let idsToRemove = [];

            while (removeCount > 0 && rootItems.length > 0)
            {
                const lastItem = rootItems[rootItems.length - 1];

                if (lastItem.upd.StackObjectsCount > removeCount)
                {
                    lastItem.upd.StackObjectsCount -= removeCount;
                    removeCount = 0;
                }
                else
                {
                    removeCount -= lastItem.upd.StackObjectsCount;
                    idsToRemove.push(lastItem._id);
                    rootItems.splice(rootItems.length - 1, 1);
                }
            }

            let foundNewItems = true;

            while (foundNewItems)
            {
                foundNewItems = false;

                for (const id of idsToRemove)
                {
                    const newIds = offer.items
                        .filter(
                            i =>
                                !idsToRemove.includes(i._id) &&
                                idsToRemove.includes(i.parentId)
                        )
                        .map(i => i._id);

                    if (newIds.length > 0)
                    {
                        foundNewItems = true;
                        idsToRemove = [...idsToRemove, ...newIds];
                    }
                }
            }

            if (idsToRemove.length > 0)
            {
                offer.items = offer.items.filter(
                    i => !idsToRemove.includes(i._id)
                );
            }
        }

        // assemble the payment items
        for (const requirement of offer.requirements)
        {
            // Create an item template item
            const requestedItem = {
                _id: HashUtil.generate(),
                _tpl: requirement._tpl,
                upd: { StackObjectsCount: requirement.count * boughtAmount },
            };

            const stacks = ItemHelper.splitStack(requestedItem);

            for (const item of stacks)
            {
                const outItems = [item];

                if (requirement.onlyFunctional)
                {
                    const presetItems =
                        RagfairServerHelper.getPresetItemsByTpl(item);

                    if (presetItems.length)
                    {
                        outItems.push(presetItems[0]);
                    }
                }

                itemsToSend = [...itemsToSend, ...outItems];
            }
        }

        // Generate a message to inform that item was sold
        const globalLocales =
            DatabaseServer.getTables().locales.global[
                LocaleService.getDesiredLocale()
            ];
        const messageTpl =
            globalLocales.mail[RagfairOfferHelper.goodSoldTemplate];
        const tplVars = {
            soldItem: globalLocales.templates[itemTpl].Name || itemTpl,
            buyerNickname: RagfairServerHelper.getNickname(HashUtil.generate()),
            itemCount: boughtAmount,
        };
        const messageText = messageTpl.replace(/{\w+}/g, matched =>
        {
            return tplVars[matched.replace(/{|}/g, "")];
        });

        const messageContent = DialogueHelper.createMessageContext(
            undefined,
            MessageType.FLEAMARKET_MESSAGE,
            QuestConfig.redeemTime
        );
        messageContent.text = messageText.replace(/"/g, "");
        messageContent.ragfair = {
            offerId: offer._id,
            count: boughtAmount,
            handbookId: itemTpl,
        };

        DialogueHelper.addDialogueMessage(
            Traders.RAGMAN,
            messageContent,
            sessionID,
            itemsToSend
        );
        return ItemEventRouter.getOutput(sessionID);
    }

    static isDisplayableOffer(info, itemsToAdd, assorts, offer, pmcProfile)
    {
        const item = offer.items[0];
        const money = offer.requirements[0]._tpl;
        const isTraderOffer = offer.user.memberType === MemberCategory.TRADER;

        if (
            pmcProfile.Info.Level <
                DatabaseServer.getTables().globals.config.RagFair
                    .minUserLevel &&
            offer.user.memberType === MemberCategory.DEFAULT
        )
        {
            // Skip item if player is < global unlock level (default is 20) and item is from a dynamically generated source
            return false;
        }

        if (!!itemsToAdd && !itemsToAdd.includes(item._tpl))
        {
            // skip items we shouldn't include
            return false;
        }

        if (
            info.offerOwnerType === OfferOwnerType.TRADEROWNERTYPE &&
            !isTraderOffer
        )
        {
            // don't include player offers
            return false;
        }

        if (
            info.offerOwnerType === OfferOwnerType.PLAYEROWNERTYPE &&
            isTraderOffer
        )
        {
            // don't include trader offers
            return false;
        }

        if (
            info.oneHourExpiration &&
            offer.endTime - TimeUtil.getTimestamp() > TimeUtil.oneHourAsSeconds
        )
        {
            // offer doesnt expire within an hour
            return false;
        }

        if (
            info.quantityFrom > 0 &&
            info.quantityFrom >= item.upd.StackObjectsCount
        )
        {
            // too little items to offer
            return false;
        }

        if (
            info.quantityTo > 0 &&
            info.quantityTo <= item.upd.StackObjectsCount
        )
        {
            // too many items to offer
            return false;
        }

        if (
            info.onlyFunctional &&
            PresetHelper.hasPreset(item._tpl) &&
            offer.items.length === 1
        )
        {
            // don't include non-functional items
            return false;
        }

        if (
            info.buildCount &&
            PresetHelper.hasPreset(item._tpl) &&
            offer.items.length > 1
        )
        {
            // don't include preset items
            return false;
        }

        if (item.upd.MedKit || item.upd.Repairable)
        {
            const itemQualityPercentage =
                100 * ItemHelper.getItemQualityModifier(item);

            if (
                info.conditionFrom > 0 &&
                info.conditionFrom > itemQualityPercentage
            )
            {
                // item condition is too low
                return false;
            }

            if (
                info.conditionTo < 100 &&
                info.conditionTo <= itemQualityPercentage
            )
            {
                // item condition is too high
                return false;
            }
        }

        // commented out as required search "which is for checking offers that are barters"
        // has info.removeBartering as true, this if statement removed barter items.
        if (info.removeBartering && !PaymentHelper.isMoneyTpl(money))
        {
            // don't include barter offers
            return false;
        }

        if (info.currency > 0 && PaymentHelper.isMoneyTpl(money))
        {
            const currencies = ["all", "RUB", "USD", "EUR"];

            if (
                RagfairHelper.getCurrencyTag(money) !==
                currencies[info.currency]
            )
            {
                // don't include item paid in wrong currency
                return false;
            }
        }

        if (info.priceFrom > 0 && info.priceFrom >= offer.requirementsCost)
        {
            // price is too low
            return false;
        }

        if (info.priceTo > 0 && info.priceTo <= offer.requirementsCost)
        {
            // price is too high
            return false;
        }

        if (isNaN(offer.requirementsCost))
        {
            // don't include offers with null or NaN in it
            return false;
        }

        // handle trader items to remove items that are not available to the user right now
        // required search for "lamp" shows 4 items, 3 of which are not available to a new player
        // filter those out
        if (offer.user.id in DatabaseServer.getTables().traders)
        {
            if (!(offer.user.id in assorts))
            {
                // trader not visible on flea market
                return false;
            }

            if (
                !assorts[offer.user.id].items.find(item =>
                {
                    return item._id === offer.root;
                })
            )
            {
                // skip (quest) locked items
                return false;
            }
        }

        return true;
    }
}

module.exports = RagfairOfferHelper;

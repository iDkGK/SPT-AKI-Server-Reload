"use strict";

require("../Lib.js");

class RagfairController
{
    static update()
    {
        for (const sessionID in SaveServer.getProfiles())
        {
            if (
                SaveServer.getProfile(sessionID).characters.pmc.RagfairInfo !==
                undefined
            )
            {
                RagfairOfferHelper.processOffersOnProfile(sessionID);
            }
        }
    }

    static getOffers(sessionID, info)
    {
        const itemsToAdd = RagfairHelper.filterCategories(sessionID, info);
        const assorts = RagfairHelper.getDisplayableAssorts(sessionID);
        const result = {
            offers: [],
            offersCount: info.limit,
            selectedCategory: info.handbookId,
        };

        // force all trader types in weapon preset build purchase
        if (info.buildCount)
        {
            info.offerOwnerType = OfferOwnerType.ANYOWNERTYPE;
            info.onlyFunctional = false;
        }

        const pmcProfile = ProfileHelper.getPmcProfile(sessionID);

        if (info.buildCount)
        {
            result.offers = RagfairOfferHelper.getOffersForBuild(
                info,
                itemsToAdd,
                assorts,
                pmcProfile
            );
        }
        else
        {
            result.offers = RagfairOfferHelper.getValidOffers(
                info,
                itemsToAdd,
                assorts,
                pmcProfile
            );
        }

        // get offer categories
        if (
            RagfairController.isLinkedSearch(info) ||
            RagfairController.isRequiredSearch(info)
        )
        {
            result.categories = RagfairServer.getBespokeCategories(
                result.offers
            );
        }

        if (info.linkedSearchId === "" && info.neededSearchId === "")
        {
            result.categories = RagfairServer.getAllCategories();
        }

        // if this is true client request "required search"
        if (info.neededSearchId)
        {
            const requiredOffers = RagfairRequiredItemsService.getRequiredItems(
                info.neededSearchId
            );
            for (const offer of requiredOffers)
            {
                if (
                    RagfairOfferHelper.isDisplayableOffer(
                        info,
                        null,
                        assorts,
                        offer,
                        pmcProfile
                    )
                )
                {
                    result.offers.push(offer);
                }
            }
        }

        // set offer indexes
        let counter = 0;

        for (const offer of result.offers)
        {
            offer.intId = ++counter;
            offer.items[0].parentId = ""; //without this it causes error:  "Item deserialization error: No parent with id hideout found for item x"
        }

        // sort offers
        result.offers = RagfairSortHelper.sortOffers(
            result.offers,
            info.sortType,
            info.sortDirection
        );

        // set categories count (needed for categories to show when choosing 'Linked search')
        RagfairHelper.countCategories(result);

        return result;
    }

    static isLinkedSearch(info)
    {
        return info.linkedSearchId !== "";
    }

    static isRequiredSearch(info)
    {
        return info.neededSearchId !== "";
    }

    static getItemPrice(info)
    {
        // get all items of tpl (sort by price)
        let offers = RagfairOfferService.getOffersOfType(info.templateId);

        if (typeof offers === "object" && offers.length > 0)
        {
            offers = RagfairSortHelper.sortOffers(offers, 5);
            // average
            let avg = 0;
            for (const offer of offers)
            {
                avg += offer.itemsCost;
            }

            return {
                avg: avg / offers.length,
                min: offers[0].itemsCost,
                max: offers[offers.length - 1].itemsCost,
            };
        }
        else
        {
            const tplPrice =
                DatabaseServer.getTables().templates.prices[info.templateId];

            return {
                avg: tplPrice,
                min: tplPrice,
                max: tplPrice,
            };
        }
    }

    static addPlayerOffer(pmcData, info, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        let requirementsPriceInRub = 0;
        const invItems = [];

        if (!info || !info.items || info.items.length === 0)
        {
            Logger.error("Invalid addOffer request");
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        if (!info.requirements)
        {
            return HttpResponseUtil.appendErrorToOutput(
                output,
                "How did you place the offer with no requirements?"
            );
        }

        for (const item of info.requirements)
        {
            const requestedItemTpl = item._tpl;

            if (PaymentHelper.isMoneyTpl(requestedItemTpl))
            {
                requirementsPriceInRub += HandbookHelper.inRUB(
                    item.count,
                    requestedItemTpl
                );
            }
            else
            {
                requirementsPriceInRub +=
                    RagfairPriceService.getDynamicPrice(requestedItemTpl) *
                    item.count;
            }
        }

        // Count how many items are being sold and multiply the requested amount accordingly
        for (const itemId of info.items)
        {
            let item = pmcData.Inventory.items.find(i => i._id === itemId);

            if (item === undefined)
            {
                Logger.error(
                    `Failed to find item with _id: ${itemId} in inventory!`
                );
                return HttpResponseUtil.appendErrorToOutput(output);
            }

            item = ItemHelper.fixItemStackCount(item);
            invItems.push(
                ...ItemHelper.findAndReturnChildrenAsItems(
                    pmcData.Inventory.items,
                    itemId
                )
            );
        }

        if (!invItems || !invItems.length)
        {
            Logger.error("Could not find any requested items in the inventory");
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        // Preparations are done, create the offer
        const offer = RagfairController.createPlayerOffer(
            SaveServer.getProfile(sessionID),
            info.requirements,
            RagfairHelper.mergeStackable(invItems),
            info.sellInOnePiece,
            requirementsPriceInRub
        );
        const rootItem = offer.items[0];
        const qualityMultiplier = ItemHelper.getItemQualityModifier(rootItem);
        const averageOfferPrice =
            RagfairPriceService.getFleaPriceForItem(rootItem._tpl) *
            rootItem.upd.StackObjectsCount *
            qualityMultiplier;
        const itemStackCount = !info.sellInOnePiece
            ? offer.items[0].upd.StackObjectsCount
            : 1;
        const singleOfferValue = averageOfferPrice / itemStackCount;
        let sellChance = RagfairConfig.sell.chance.base * qualityMultiplier;

        sellChance = RagfairSellHelper.calculateSellChance(
            sellChance,
            singleOfferValue,
            requirementsPriceInRub
        );
        offer.sellResult = RagfairSellHelper.rollForSale(
            sellChance,
            itemStackCount
        );

        // Subtract flea market fee from stash
        if (RagfairConfig.sell.fees)
        {
            const tax = RagfairTaxHelper.calculateTax(
                rootItem,
                pmcData,
                requirementsPriceInRub,
                itemStackCount,
                info.sellInOnePiece
            );

            const request = {
                tid: "ragfair",
                Action: "TradingConfirm",
                scheme_items: [
                    {
                        id: PaymentHelper.getCurrency("RUB"),
                        count: Math.round(tax),
                    },
                ],
                type: "",
                item_id: "",
                count: 0,
                scheme_id: 0,
            };

            output = PaymentService.payMoney(
                pmcData,
                request,
                sessionID,
                output
            );
            if (output.warnings.length > 0)
            {
                return HttpResponseUtil.appendErrorToOutput(
                    output,
                    "Couldn't pay commission fee",
                    "Transaction failed"
                );
            }
        }

        SaveServer.getProfile(sessionID).characters.pmc.RagfairInfo.offers.push(
            offer
        );
        output.profileChanges[sessionID].ragFairOffers.push(offer);

        // Remove items from inventory after creating offer
        for (const itemToRemove of info.items)
        {
            InventoryHelper.removeItem(
                pmcData,
                itemToRemove,
                sessionID,
                output
            );
        }

        return output;
    }

    static createPlayerOffer(
        profile,
        requirements,
        items,
        sellInOnePiece,
        amountToSend
    )
    {
        const loyalLevel = 1;
        const formattedItems = items.map(item =>
        {
            const isChild = items.find(it => it._id === item.parentId);

            return {
                _id: item._id,
                _tpl: item._tpl,
                parentId: isChild ? item.parentId : "hideout",
                slotId: isChild ? item.slotId : "hideout",
                upd: item.upd,
            };
        });

        const formattedRequirements = requirements.map(item =>
        {
            return {
                _tpl: item._tpl,
                count: item.count,
                onlyFunctional: item.onlyFunctional,
            };
        });

        return RagfairOfferGenerator.createFleaOffer(
            profile.characters.pmc.aid,
            TimeUtil.getTimestamp(),
            formattedItems,
            formattedRequirements,
            loyalLevel,
            amountToSend,
            sellInOnePiece
        );
    }

    static getAllFleaPrices()
    {
        return RagfairPriceService.getAllFleaPrices();
    }

    /*
     *  User requested removal of the offer, actually reduces the time to 71 seconds,
     *  allowing for the possibility of extending the auction before it's end time
     */
    static removeOffer(offerId, sessionID)
    {
        const offers =
            SaveServer.getProfile(sessionID).characters.pmc.RagfairInfo.offers;
        const index = offers.findIndex(offer => offer._id === offerId);

        if (index === -1)
        {
            Logger.warning(
                `Could not find offer to remove with offerId -> ${offerId}`
            );
            return HttpResponseUtil.appendErrorToOutput(
                ItemEventRouter.getOutput(sessionID),
                "Offer not found in profile"
            );
        }

        const differenceInMins =
            (offers[index].endTime - TimeUtil.getTimestamp()) / 6000;

        if (differenceInMins > 1)
        {
            const newEndTime = 11 + TimeUtil.getTimestamp();
            offers[index].endTime = Math.round(newEndTime);
        }

        return ItemEventRouter.getOutput(sessionID);
    }

    static extendOffer(info, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        const offers =
            SaveServer.getProfile(sessionID).characters.pmc.RagfairInfo.offers;
        const index = offers.findIndex(offer => offer._id === info.offerId);
        const secondsToAdd = info.renewalTime * TimeUtil.oneHourAsSeconds;

        if (index === -1)
        {
            Logger.warning(
                `Could not find offer to remove with offerId -> ${info.offerId}`
            );
            return HttpResponseUtil.appendErrorToOutput(
                ItemEventRouter.getOutput(sessionID),
                "Offer not found in profile"
            );
        }

        // MOD: Pay flea market fee
        if (RagfairConfig.sell.fees)
        {
            const count = offers[index].sellInOnePiece
                ? 1
                : offers[index].items.reduce(
                    (sum, item) => (sum += item.upd.StackObjectsCount),
                    0
                );
            const tax = RagfairTaxHelper.calculateTax(
                offers[index].items[0],
                ProfileHelper.getPmcProfile(sessionID),
                offers[index].requirementsCost,
                count,
                offers[index].sellInOnePiece
            );

            const request = {
                tid: "ragfair",
                Action: "TradingConfirm",
                scheme_items: [
                    {
                        id: PaymentHelper.getCurrency("RUB"),
                        count: Math.round(tax),
                    },
                ],
                type: "",
                item_id: "",
                count: 0,
                scheme_id: 0,
            };

            output = PaymentService.payMoney(
                SaveServer.getProfile(sessionID).characters.pmc,
                request,
                sessionID,
                output
            );
            if (output.warnings.length > 0)
            {
                return HttpResponseUtil.appendErrorToOutput(
                    output,
                    "Couldn't pay commission fee",
                    "Transaction failed"
                );
            }
        }

        offers[index].endTime += Math.round(secondsToAdd);

        return ItemEventRouter.getOutput(sessionID);
    }
}

module.exports = RagfairController;

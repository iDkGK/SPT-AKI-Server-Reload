"use strict";

require("../Lib.js");

class RagfairController
{
    static getOffers(sessionID, info)
    {
        const itemsToAdd = RagfairHelper.filterCategories(sessionID, info);
        const assorts = RagfairHelper.getDisplayableAssorts(sessionID);
        const result = {
            categories: {},
            offers: [],
            offersCount: info.limit,
            selectedCategory: "5b5f78dc86f77409407a7f8e",
        };

        // force all trader types in weapon preset build purchase
        if (info.buildCount)
        {
            info.offerOwnerType =
                RagfairServerHelper.offerOwnerType.anyOwnerType;
            info.onlyFunctional = false;
        }

        // get offer categories
        if (!info.linkedSearchId && !info.neededSearchId)
        {
            result.categories = RagfairServer.getCategories();
        }

        const pmcProfile = ProfileHelper.getPmcProfile(sessionID);
        result.offers = info.buildCount
            ? RagfairHelper.getOffersForBuild(
                info,
                itemsToAdd,
                assorts,
                pmcProfile
            )
            : RagfairHelper.getValidOffers(
                info,
                itemsToAdd,
                assorts,
                pmcProfile
            );

        if (info.neededSearchId)
        {
            const requiredOffers =
                RagfairServer.requiredItemsCache[info.neededSearchId] || [];
            for (const offer of requiredOffers)
            {
                if (
                    RagfairHelper.isDisplayableOffer(
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
        result.offers = RagfairHelper.sortOffers(
            result.offers,
            info.sortType,
            info.sortDirection
        );

        // set categories count (needed for categories to show when choosing 'Linked search')
        RagfairHelper.countCategories(result);

        return result;
    }

    static update()
    {
        for (const sessionID in SaveServer.getProfiles())
        {
            if (
                SaveServer.getProfile(sessionID).characters.pmc.RagfairInfo !==
                undefined
            )
            {
                RagfairHelper.processOffers(sessionID);
            }
        }
    }

    static getItemPrice(info)
    {
        // get all items of tpl (sort by price)
        let offers = RagfairServer.offers.filter(offer =>
        {
            return offer.items[0]._tpl === info.templateId;
        });

        if (typeof offers === "object" && offers.length > 0)
        {
            offers = RagfairHelper.sortOffers(offers, 5);
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
                DatabaseServer.tables.templates.prices[info.templateId];
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
            return HttpResponse.appendErrorToOutput(output);
        }

        if (!info.requirements)
        {
            return HttpResponse.appendErrorToOutput(
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
                    RagfairServer.getDynamicPrice(requestedItemTpl) *
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
                return HttpResponse.appendErrorToOutput(output);
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
            return HttpResponse.appendErrorToOutput(output);
        }

        // Preparations are done, create the offer
        const offer = RagfairHelper.createPlayerOffer(
            SaveServer.getProfile(sessionID),
            info.requirements,
            RagfairHelper.mergeStackable(invItems),
            info.sellInOnePiece,
            requirementsPriceInRub
        );
        const rootItem = offer.items[0];
        const qualityMultiplier = ItemHelper.getItemQualityModifier(rootItem);
        const offerPrice =
            RagfairServer.getDynamicPrice(rootItem._tpl) *
            rootItem.upd.StackObjectsCount *
            qualityMultiplier;
        const itemStackCount = !info.sellInOnePiece
            ? offer.items[0].upd.StackObjectsCount
            : 1;
        const offerValue = offerPrice / itemStackCount;
        let sellChance = RagfairConfig.sell.chance.base * qualityMultiplier;

        sellChance = RagfairHelper.calculateSellChance(
            sellChance,
            offerValue,
            requirementsPriceInRub
        );
        offer.sellResult = RagfairHelper.rollForSale(
            sellChance,
            itemStackCount
        );

        // Subtract flea market fee from stash
        if (RagfairConfig.sell.fees)
        {
            const tax = RagfairHelper.calculateTax(
                rootItem,
                pmcData,
                requirementsPriceInRub,
                itemStackCount,
                info.sellInOnePiece
            );
            Logger.debug(`Tax Calculated to be: ${tax}`);

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
                return HttpResponse.appendErrorToOutput(
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

    // This method, along with calculateItemWorth, is trying to mirror the client-side code found in the method "CalculateTaxPrice".
    // It's structured to resemble the client-side code as closely as possible - avoid making any big structure changes if it's not necessary.
    static calculateTax(
        item,
        pmcData,
        requirementsValue,
        offerItemCount,
        sellInOnePiece
    )
    {
        if (!requirementsValue)
        {
            return 0;
        }

        if (!offerItemCount)
        {
            return 0;
        }

        const itemTemplate = ItemHelper.getItem(item._tpl)[1];
        const itemWorth = RagfairController.calculateItemWorth(
            item,
            itemTemplate,
            offerItemCount,
            pmcData
        );
        const requirementsPrice =
            requirementsValue * (sellInOnePiece ? 1 : offerItemCount);

        const itemTaxMult =
            DatabaseServer.tables.globals.config.RagFair.communityItemTax /
            100.0;
        const requirementTaxMult =
            DatabaseServer.tables.globals.config.RagFair
                .communityRequirementTax / 100.0;

        let itemPriceMult = Math.log10(itemWorth / requirementsPrice);
        let requirementPriceMult = Math.log10(requirementsPrice / itemWorth);

        if (requirementsPrice >= itemWorth)
        {
            requirementPriceMult = Math.pow(requirementPriceMult, 1.08);
        }
        else
        {
            itemPriceMult = Math.pow(itemPriceMult, 1.08);
        }

        itemPriceMult = Math.pow(4, itemPriceMult);
        requirementPriceMult = Math.pow(4, requirementPriceMult);

        const hideoutFleaTaxDiscountBonus = pmcData.Bonuses.find(
            b => b.type === "RagfairCommission"
        );
        const taxDiscountPercent = hideoutFleaTaxDiscountBonus
            ? Math.abs(hideoutFleaTaxDiscountBonus.value)
            : 0;

        const tax =
            itemWorth * itemTaxMult * itemPriceMult +
            requirementsPrice * requirementTaxMult * requirementPriceMult;
        const discountedTax = tax * (1.0 - taxDiscountPercent / 100.0);
        const itemComissionMult = itemTemplate._props.RagFairCommissionModifier
            ? itemTemplate._props.RagFairCommissionModifier
            : 1;

        return Math.round(discountedTax * itemComissionMult);
    }

    // This method is trying to replicate the item worth calculation method found in the client code.
    // Any inefficiencies or style issues are intentional and should not be fixed, to preserve the client-side code mirroring.
    static calculateItemWorth(
        item,
        itemTemplate,
        itemCount,
        pmcData,
        isRootItem = true
    )
    {
        let worth = RagfairServer.getDynamicPrice(item._tpl);

        // In client, all item slots are traversed and any items contained within have their values added
        if (isRootItem)
        {
            // Since we get a flat list of all child items, we only want to recurse from parent item
            const itemChildren = ItemHelper.findAndReturnChildrenAsItems(
                pmcData.Inventory.items,
                item._id
            );
            if (itemChildren.length > 1)
            {
                for (const child of itemChildren)
                {
                    if (child._id === item._id)
                    {
                        continue;
                    }

                    worth += RagfairController.calculateItemWorth(
                        child,
                        ItemHelper.getItem(child._tpl)[1],
                        child.upd.StackObjectsCount,
                        pmcData,
                        false
                    );
                }
            }
        }

        if ("Dogtag" in item.upd)
        {
            worth *= item.upd.Dogtag.Level;
        }

        if ("Key" in item.upd && itemTemplate._props.MaximumNumberOfUsage > 0)
        {
            worth =
                (worth / itemTemplate._props.MaximumNumberOfUsage) *
                (itemTemplate._props.MaximumNumberOfUsage -
                    item.upd.Key.NumberOfUsages);
        }

        if ("Resource" in item.upd && itemTemplate._props.MaxResource > 0)
        {
            worth =
                worth * 0.1 +
                ((worth * 0.9) / itemTemplate._props.MaxResource) *
                    item.upd.Resource.Value;
        }

        if ("SideEffect" in item.upd && itemTemplate._props.MaxResource > 0)
        {
            worth =
                worth * 0.1 +
                ((worth * 0.9) / itemTemplate._props.MaxResource) *
                    item.upd.SideEffect.Value;
        }

        if ("MedKit" in item.upd && itemTemplate._props.MaxHpResource > 0)
        {
            worth =
                (worth / itemTemplate._props.MaxHpResource) *
                item.upd.MedKit.HpResource;
        }

        if ("FoodDrink" in item.upd && itemTemplate._props.MaxResource > 0)
        {
            worth =
                (worth / itemTemplate._props.MaxResource) *
                item.upd.FoodDrink.HpPercent;
        }

        if ("Repairable" in item.upd && itemTemplate._props.armorClass > 0)
        {
            const num2 =
                0.01 * Math.pow(0.0, item.upd.Repairable.MaxDurability);
            worth =
                worth *
                    (item.upd.Repairable.MaxDurability /
                        itemTemplate._props.Durability -
                        num2) -
                Math.floor(
                    itemTemplate._props.RepairCost *
                        (item.upd.Repairable.MaxDurability -
                            item.upd.Repairable.Durability)
                );
        }

        return worth * itemCount;
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
            return HttpResponse.appendErrorToOutput(
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
            return HttpResponse.appendErrorToOutput(
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
            const tax = RagfairHelper.calculateTax(
                offers[index].items[0],
                ProfileHelper.getPmcProfile(sessionID),
                offers[index].requirementsCost,
                count,
                offers[index].sellInOnePiece
            );

            Logger.debug(`Tax Calculated to be: ${tax}`);

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
                return HttpResponse.appendErrorToOutput(
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

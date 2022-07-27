"use strict";

require("../Lib.js");

class RagfairHelper
{
    static TPL_GOODS_SOLD = "5bdac0b686f7743e1665e09e";
    static TPL_GOODS_RETURNED = "5bdac06e86f774296f5a19c5";

    static returnItems(sessionID, items)
    {
        const messageContent = DialogueHelper.createMessageContext(
            undefined,
            DialogueHelper.getMessageTypeValue("messageWithItems"),
            QuestConfig.redeemTime
        );
        messageContent.text =
            DatabaseServer.tables.locales.global["en"].mail[
                RagfairController.TPL_GOODS_RETURNED
            ];
        DialogueHelper.addDialogueMessage(
            TraderHelper.TRADER.Ragman,
            messageContent,
            sessionID,
            items
        );
    }

    /**
     * Gets currency TAG from TPL
     * @param {string} currency
     * @returns string
     */
    static getCurrencyTag(currency)
    {
        switch (currency)
        {
            case "569668774bdc2da2298b4568":
                return "EUR";
            case "5696686a4bdc2da3298b456a":
                return "USD";
            case "5449016a4bdc2d6f028b456f":
                return "RUB";
            default:
                return "";
        }
    }

    static sortOffersByID(a, b)
    {
        return a.intId - b.intId;
    }

    static sortOffersByRating(a, b)
    {
        return a.user.rating - b.user.rating;
    }

    static sortOffersByName(a, b)
    {
        const ia = a.items[0]._tpl;
        const ib = b.items[0]._tpl;
        const aa =
            DatabaseServer.tables.locales.global["en"].templates[ia].Name || ia;
        const bb =
            DatabaseServer.tables.locales.global["en"].templates[ib].Name || ib;
        return aa < bb ? -1 : aa > bb ? 1 : 0;
    }

    static sortOffersByPrice(a, b)
    {
        return a.requirementsCost - b.requirementsCost;
    }

    static sortOffersByExpiry(a, b)
    {
        return a.endTime - b.endTime;
    }

    static sortOffers(offers, type, direction = 0)
    {
        // Sort results
        switch (type)
        {
            case 0: // ID
                offers.sort(RagfairHelper.sortOffersByID);
                break;
            case 3: // Merchant (rating)
                offers.sort(RagfairHelper.sortOffersByRating);
                break;
            case 4: // Offer (title)
                offers.sort(RagfairHelper.sortOffersByName);
                break;
            case 5: // Price
                offers.sort(RagfairHelper.sortOffersByPrice);
                break;
            case 6: // Expires in
                offers.sort(RagfairHelper.sortOffersByExpiry);
                break;
        }

        // 0=ASC 1=DESC
        if (direction === 1)
        {
            offers.reverse();
        }
        return offers;
    }

    static getValidOffers(info, itemsToAdd, assorts, pmcProfile)
    {
        const offers = [];
        for (const offer of RagfairServer.offers)
        {
            if (
                RagfairHelper.isDisplayableOffer(
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
        for (const offer of RagfairServer.offers)
        {
            if (
                RagfairHelper.isDisplayableOffer(
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
            const offer = RagfairHelper.sortOffers(tmpOffers, 5, 0)[0];
            offers.push(offer);
        }
        return offers;
    }

    static filterCategories(sessionID, info)
    {
        let result = [];
        // Case: weapon builds
        if (info.buildCount)
        {
            return Object.keys(info.buildItems);
        }

        // Case: search
        if (info.linkedSearchId)
        {
            result = Array.from(
                RagfairServer.linkedItemsCache[info.linkedSearchId] || []
            );
        }

        // Case: category
        if (info.handbookId)
        {
            const handbook = RagfairHelper.getCategoryList(info.handbookId);
            if (result.length)
            {
                result = UtilityHelper.arrayIntersect(result, handbook);
            }
            else
            {
                result = handbook;
            }
        }
        return result;
    }

    static getDisplayableAssorts(sessionID)
    {
        const result = {};
        for (const traderID in DatabaseServer.tables.traders)
        {
            if (RagfairConfig.traders[traderID])
            {
                result[traderID] = TraderController.getAssort(
                    sessionID,
                    traderID
                );
            }
        }
        return result;
    }

    static isDisplayableOffer(info, itemsToAdd, assorts, offer, pmcProfile)
    {
        const item = offer.items[0];
        const money = offer.requirements[0]._tpl;
        const isTraderOffer = offer.user.memberType === MemberCategory.Trader;
        if (
            pmcProfile.Info.Level <
                DatabaseServer.tables.globals.config.RagFair.minUserLevel &&
            offer.user.memberType === MemberCategory.Default
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
            const percentage = 100 * ItemHelper.getItemQualityModifier(item);
            if (info.conditionFrom > 0 && info.conditionFrom >= percentage)
            {
                // item condition is too low
                return false;
            }

            if (info.conditionTo < 100 && info.conditionTo <= percentage)
            {
                // item condition is too high
                return false;
            }
        }

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

        // handle trader items
        if (offer.user.id in DatabaseServer.tables.traders)
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

    static getCategoryList(handbookId)
    {
        let result = [];
        // if its "mods" great-parent category, do double recursive loop
        if (handbookId === "5b5f71a686f77447ed5636ab")
        {
            for (const categ of HandbookHelper.childrenCategories(handbookId))
            {
                for (const subcateg of HandbookHelper.childrenCategories(
                    categ
                ))
                {
                    result = [
                        ...result,
                        ...HandbookHelper.templatesWithParent(subcateg),
                    ];
                }
            }
            return result;
        }

        // item is in any other category
        if (HandbookHelper.isCategory(handbookId))
        {
            // list all item of the category
            result = HandbookHelper.templatesWithParent(handbookId);
            for (const categ of HandbookHelper.childrenCategories(handbookId))
            {
                result = [
                    ...result,
                    ...HandbookHelper.templatesWithParent(categ),
                ];
            }
            return result;
        }
        // its a specific item searched
        result.push(handbookId);
        return result;
    }

    static countCategories(result)
    {
        const categories = {};
        for (const offer of result.offers)
        {
            // only the first item can have presets
            const item = offer.items[0];
            categories[item._tpl] = categories[item._tpl] || 0;
            categories[item._tpl]++;
        }

        // not in search mode, add back non-weapon items
        for (const category in result.categories)
        {
            if (!categories[category])
            {
                categories[category] = 1;
            }
        }
        result.categories = categories;
    }

    static processOffers(sessionID)
    {
        const timestamp = TimeUtil.getTimestamp();
        for (const sessionID in SaveServer.getProfiles())
        {
            const profileOffers = RagfairHelper.getProfileOffers(sessionID);
            if (!profileOffers || !profileOffers.length)
            {
                continue;
            }

            for (const [index, offer] of profileOffers.entries())
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
                        SaveServer.getProfile(sessionID).characters.pmc
                            .RagfairInfo;
                    profileRagfairInfo.rating +=
                        ((RagfairConfig.sell.reputation.gain *
                            offer.summaryCost) /
                            totalItemsCount) *
                        boughtAmount;
                    profileRagfairInfo.isRatingGrowing = true;
                    RagfairHelper.completeOffer(sessionID, offer, boughtAmount);
                    offer.sellResult.splice(0, 1);
                }
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
        let index = profileRagfairInfo.offers.findIndex(o => o._id === offerId);
        profileRagfairInfo.offers.splice(index, 1);
        index = RagfairServer.offers.findIndex(o => o._id === offerId);
        RagfairServer.offers.splice(index, 1);
    }

    static mergeStackable(items)
    {
        const list = [];
        let rootItem = null;
        for (let item of items)
        {
            item = ItemHelper.fixItemStackCount(item);
            const isChild = items.find(it => it._id === item.parentId);
            if (!isChild)
            {
                if (!rootItem)
                {
                    rootItem = JsonUtil.clone(item);
                    rootItem.upd.OriginalStackObjectsCount =
                        rootItem.upd.StackObjectsCount;
                }
                else
                {
                    rootItem.upd.StackObjectsCount +=
                        item.upd.StackObjectsCount;
                    list.push(item);
                }
            }
            else
            {
                list.push(item);
            }
        }
        return [...[rootItem], ...list];
    }

    static calculateSellChance(baseChance, offerPrice, requirementsPriceInRub)
    {
        const multiplier =
            requirementsPriceInRub > offerPrice
                ? RagfairConfig.sell.chance.overprices
                : requirementsPriceInRub < offerPrice
                    ? RagfairConfig.sell.chance.underpriced
                    : 1;
        return Math.round(
            baseChance * ((offerPrice / requirementsPriceInRub) * multiplier)
        );
    }

    static rollForSale(sellChance, count)
    {
        const startTime = TimeUtil.getTimestamp();
        const endTime = startTime + 43200;
        const chance = 100 - Math.min(Math.max(sellChance, 0), 100);
        let sellTime = startTime;
        let remainingCount = count;
        const result = [];
        // Avoid rolling for NaN sellChance
        sellChance = sellChance || RagfairConfig.sell.chance.base;
        Logger.debug(`Rolling for sell ${count} items (chance: ${sellChance})`);
        while (remainingCount > 0 && sellTime < endTime)
        {
            sellTime += Math.max(
                Math.round((chance / 100) * RagfairConfig.sell.time.max * 60),
                RagfairConfig.sell.time.min * 60
            );
            if (RandomUtil.getInt(0, 99) < sellChance)
            {
                const boughtAmount = RandomUtil.getInt(1, remainingCount);
                result.push({
                    sellTime: sellTime,
                    amount: boughtAmount,
                });
                remainingCount -= boughtAmount;
            }
        }
        return result;
    }

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
        const itemWorth = RagfairHelper.calculateItemWorth(
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
                    worth += RagfairHelper.calculateItemWorth(
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

    static getCurrencySymbol(currencyTpl)
    {
        switch (currencyTpl)
        {
            case ItemHelper.MONEY.Euros:
                return "€";
            case ItemHelper.MONEY.Dollars:
                return "$";
            case ItemHelper.MONEY.Roubles:
            default:
                return "₽";
        }
    }

    static formatCurrency(moneyAmount)
    {
        return moneyAmount.toString().replace(/(\d)(?=(\d{3})+$)/g, "$1 ");
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
            RagfairHelper.deleteOfferByOfferId(sessionID, offer._id);
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
                    const presetItems = RagfairServer.getPresetItemsByTpl(item);
                    if (presetItems.length)
                    {
                        outItems.push(presetItems[0]);
                    }
                }
                itemsToSend = [...itemsToSend, ...outItems];
            }
        }
        // Generate a message to inform that item was sold
        const messageTpl =
            DatabaseServer.tables.locales.global["en"].mail[
                RagfairHelper.TPL_GOODS_SOLD
            ];
        const tplVars = {
            soldItem:
                DatabaseServer.tables.locales.global["en"].templates[itemTpl]
                    .Name || itemTpl,
            buyerNickname: RagfairServerHelper.getNickname(HashUtil.generate()),
            itemCount: boughtAmount,
        };
        const messageText = messageTpl.replace(/{\w+}/g, matched =>
        {
            return tplVars[matched.replace(/{|}/g, "")];
        });
        const messageContent = DialogueHelper.createMessageContext(
            undefined,
            MessageType.FleamarketMessage,
            QuestConfig.redeemTime
        );
        messageContent.text = messageText.replace(/"/g, "");
        messageContent.ragfair = {
            offerId: offer._id,
            count: boughtAmount,
            handbookId: itemTpl,
        };
        DialogueHelper.addDialogueMessage(
            TraderHelper.TRADER.Ragman,
            messageContent,
            sessionID,
            itemsToSend
        );
        return ItemEventRouter.getOutput(sessionID);
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
        return RagfairServer.createFleaOffer(
            profile.characters.pmc.aid,
            TimeUtil.getTimestamp(),
            formattedItems,
            formattedRequirements,
            loyalLevel,
            amountToSend,
            sellInOnePiece
        );
    }
}

module.exports = RagfairHelper;

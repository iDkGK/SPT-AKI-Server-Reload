"use strict";

require("../Lib.js");

class RagfairServer
{
    static toUpdate = {};
    static expiredOffers = [];
    static offers = [];
    static categories = {};
    static prices = {
        "static": {},
        "dynamic": {}
    };
    static linkedItemsCache = {};
    static requiredItemsCache = {};

    static load()
    {
        RagfairServer.buildLinkedItemTable();
        RagfairServer.generateStaticPrices();
        RagfairServer.generateDynamicPrices();
        RagfairServer.generateDynamicOffers();
        RagfairServer.addTraders();
        RagfairServer.update();
    }

    static buildLinkedItemTable()
    {
        const linkedItems = {};
        const getLinkedItems = id =>
        {
            if (!(id in linkedItems))
            {
                linkedItems[id] = new Set();
            }
            return linkedItems[id];
        };

        for (const item of Object.values(DatabaseServer.tables.templates.items))
        {
            const itemLinkedSet = getLinkedItems(item._id);

            const applyLinkedItems = items =>
            {
                for (const linkedItemId of items)
                {
                    itemLinkedSet.add(linkedItemId);
                    getLinkedItems(linkedItemId).add(item._id);
                }
            };

            applyLinkedItems(RagfairServer.getFilters(item, "Slots"));
            applyLinkedItems(RagfairServer.getFilters(item, "Chambers"));
            applyLinkedItems(RagfairServer.getFilters(item, "Cartridges"));
        }

        RagfairServer.linkedItemsCache = linkedItems;
    }

    static generateStaticPrices()
    {
        for (const itemID in DatabaseServer.tables.templates.items)
        {
            RagfairServer.prices.static[itemID] = Math.round(HandbookController.getTemplatePrice(itemID));
        }
    }

    static generateDynamicPrices()
    {
        Object.assign(RagfairServer.prices.dynamic, DatabaseServer.tables.templates.prices);
    }

    static generateDynamicOffers(expiredOffers = null)
    {
        const config = RagfairConfig.dynamic;

        // get assort items from param if they exist, otherwise grab freshly generated assorts
        const assortItemsToProcess = (expiredOffers)
            ? expiredOffers
            : RagfairAssortGenerator.getAssortItems();

        for (const assortItemIndex in assortItemsToProcess)
        {
            const assortItem = assortItemsToProcess[assortItemIndex];
            const itemDetails = ItemHelper.getItem(assortItem._tpl);

            const isPreset = PresetController.isPreset(assortItem._id);

            // Only perform checks on newly generated items, skip expired items being refreshed
            if (!expiredOffers && !RagfairServerHelper.isItemValidRagfairItem(itemDetails))
            {
                continue;
            }

            // Get item + sub-items if preset, otherwise just get item
            let items = (isPreset)
                ? RagfairServer.getPresetItems(assortItem)
                : [...[assortItem], ...ItemHelper.findAndReturnChildrenByAssort(assortItem._id, RagfairAssortGenerator.getAssortItems())];

            // Get number of offers to show for item and add to ragfairServer
            const offerCount = (expiredOffers)
                ? 1
                : Math.round(RandomUtil.getInt(config.offerItemCount.min, config.offerItemCount.max));

            for (let index = 0; index < offerCount; index++)
            {
                items[0].upd.StackObjectsCount = RagfairServerHelper.CalculateDynamicStackCount(items[0]._tpl, isPreset);

                const userID = HashUtil.generate();
                // get properties
                items = RagfairServer.getItemCondition(userID, items, itemDetails[1]);
                const barterScheme = RagfairServer.getOfferRequirements(items);
                const price = RagfairServer.getBarterPrice(barterScheme);

                RagfairServer.createFleaOffer(
                    userID,                  // userID
                    TimeUtil.getTimestamp(), // time
                    items,                   // items
                    barterScheme,             // barter scheme
                    1,                       // loyal level
                    price,                   // price
                    isPreset);               // sellAsOnePiece
            }
        }
    }

    /**
     * Create a flea offer and store it in the Ragfair server offers array
     */
    static createFleaOffer(userID, time, items, barterScheme, loyalLevel, price, sellInOnePiece = false)
    {
        const offer = RagfairOfferGenerator.createOffer(userID, time, items, barterScheme, loyalLevel, price, sellInOnePiece);
        RagfairServer.offers.push(offer);

        return offer;
    }

    static addTraders()
    {
        for (const traderID in DatabaseServer.tables.traders)
        {
            RagfairServer.toUpdate[traderID] = RagfairConfig.traders[traderID] || false;
        }
    }

    static update()
    {
        // remove expired offers
        const time = TimeUtil.getTimestamp();

        for (const i in RagfairServer.offers)
        {
            const offer = RagfairServer.offers[i];

            if (RagfairServer.isExpired(offer, time))
            {
                RagfairServer.processExpiredOffer(offer, i);
            }
        }

        // generate trader offers
        for (const traderID in RagfairServer.toUpdate)
        {
            if (RagfairServer.toUpdate[traderID])
            {
                // trader offers expired or no offers found
                RagfairServer.generateTraderOffers(traderID);
                RagfairServer.toUpdate[traderID] = false;
            }
        }

        // Regen expired offers when over threshold count
        if (RagfairServer.expiredOffers.length >= RagfairConfig.dynamic.expiredOfferThreshold)
        {
            if (RagfairServer.prices.dynamic.length === 0)
            {
                RagfairServer.generateDynamicPrices();
            }

            RagfairServer.generateDynamicOffers(RagfairServer.expiredOffers);

            // reset expired offers now we've genned them
            RagfairServer.expiredOffers = [];
        }

        // set available categories
        RagfairServer.categories = {};
        for (const offer of RagfairServer.offers)
        {
            const itemId = offer.items[0]._tpl;

            if (!RagfairServer.categories[itemId])
            {
                RagfairServer.categories[itemId] = 1;
            }
            else
            {
                RagfairServer.categories[itemId]++;
            }
        }

        RagfairServer.buildRequiredItemTable();
    }

    static processExpiredOffer(expiredOffer, globalOfferIndex)
    {
        const expiredOfferUserId = expiredOffer.user.id;
        const isTrader = RagfairServerHelper.isTrader(expiredOfferUserId);
        const isPlayer = RagfairServerHelper.isPlayer(expiredOfferUserId.replace(/^pmc/, ""));

        // handle trader offer
        if (isTrader)
        {
            RagfairServer.toUpdate[expiredOfferUserId] = true;
        }

        // handle dynamic offer
        if (!isTrader && !isPlayer)
        {
            // Dynamic offer
            RagfairServer.expiredOffers.push(expiredOffer.items[0]);
        }

        // handle player offer - items need returning/XP adjusting
        if (isPlayer)
        {
            RagfairServer.returnPlayerOffer(expiredOffer);
        }

        // remove expired existing offer from global offers
        RagfairServer.offers.splice(globalOfferIndex, 1);
    }

    /* Scans a given slot type for filters and returns them as a Set */
    static getFilters(item, slot)
    {
        if (!(slot in item._props && item._props[slot].length))
        {
            // item slot doesnt exist
            return [];
        }

        const filters = [];
        for (const sub of item._props[slot])
        {
            if (!("_props" in sub && "filters" in sub._props))
            {
                // not a filter
                continue;
            }

            for (const filter of sub._props.filters)
            {
                for (const f of filter.Filter)
                {
                    filters.push(f);
                }
            }
        }

        return filters;
    }

    /* Similar to getFilters but breaks early and return true if id is found in filters */
    // TODO: is this used?
    static isInFilter(id, item, slot)
    {
        if (!(slot in item._props && item._props[slot].length))
        {
            // item slot doesnt exist
            return false;
        }

        // get slot
        for (const sub of item._props[slot])
        {
            if (!("_props" in sub && "filters" in sub._props))
            {
                // not a filter
                continue;
            }

            // find item in filter
            for (const filter of sub._props.filters)
            {
                if (filter.Filter.includes(id))
                {
                    return true;
                }
            }
        }

        return false;
    }

    static addPlayerOffers()
    {
        for (const sessionID in SaveServer.profiles)
        {
            const pmcData = SaveServer.profiles[sessionID].characters.pmc;

            if (pmcData.RagfairInfo === undefined || pmcData.RagfairInfo.offers === undefined)
            {
                // profile is wiped
                continue;
            }

            const profileOffers = pmcData.RagfairInfo.offers;
            for (const offer of profileOffers)
            {
                RagfairServer.offers.push(offer);
            }
        }
    }

    static buildRequiredItemTable()
    {
        const requiredItems = {};
        const getRequiredItems = id =>
        {
            if (!(id in requiredItems))
            {
                requiredItems[id] = new Set();
            }

            return requiredItems[id];
        };

        for (const offer of RagfairServer.offers)
        {
            for (const requirement of offer.requirements)
            {
                if (PaymentController.isMoneyTpl(requirement._tpl))
                {
                    // This would just be too noisy.
                    continue;
                }

                getRequiredItems(requirement._tpl).add(offer);
            }
        }

        RagfairServer.requiredItemsCache = requiredItems;
    }

    static generateTraderOffers(traderID)
    {
        // ensure old offers don't exist
        RagfairServer.offers = RagfairServer.offers.filter((offer) =>
        {
            return offer.user.id !== traderID;
        });

        // add trader offers
        const time = TimeUtil.getTimestamp();
        let assort = DatabaseServer.tables.traders[traderID].assort;

        if (traderID === TraderHelper.TRADER.Fence)
        {
            assort = TraderController.fenceAssort || { "items": [] };
        }

        for (const item of assort.items)
        {
            if (item.slotId !== "hideout")
            {
                // skip mod items
                continue;
            }

            // Don't include items that BSG has blacklisted from flea
            if (RagfairConfig.dynamic.blacklist.enableBsgList && !ItemHelper.getItem(item._tpl)[1]._props.CanSellOnRagfair)
            {
                continue;
            }

            const isPreset = PresetController.isPreset(item._id);
            const items = (isPreset) ? RagfairServer.getPresetItems(item) : [...[item], ...ItemHelper.findAndReturnChildrenByAssort(item._id, assort.items)];
            const barterScheme = assort.barter_scheme[item._id][0];
            const loyalLevel = assort.loyal_level_items[item._id];
            const price = RagfairServer.getBarterPrice(barterScheme);

            RagfairServer.createFleaOffer(traderID, time, items, barterScheme, loyalLevel, price);
        }
    }

    static getItemCondition(userID, items, itemDetails)
    {
        const item = RagfairServer.addMissingCondition(items[0]);

        if (!RagfairServerHelper.isPlayer(userID) && !RagfairServerHelper.isTrader(userID))
        {
            if (RandomUtil.getInt(0, 99) < (RagfairConfig.dynamic.condition.conditionChance * 100))
            {
                const multiplier = RandomUtil.getFloat(RagfairConfig.dynamic.condition.min, RagfairConfig.dynamic.condition.max);

                if ("Repairable" in item.upd)
                {
                    // randomise non-0 class armor
                    if (itemDetails._props.armorClass && itemDetails._props.armorClass !== "0")
                    {
                        // randomize durability
                        item.upd.Repairable.Durability = Math.round(item.upd.Repairable.Durability * multiplier) || 1;
                    }

                    if (!itemDetails._props.armorClass)
                    {
                        // randomize durability
                        item.upd.Repairable.Durability = Math.round(item.upd.Repairable.Durability * multiplier) || 1;
                    }
                }

                if ("MedKit" in item.upd)
                {
                    // randomize health
                    item.upd.MedKit.HpResource = Math.round(item.upd.MedKit.HpResource * multiplier) || 1;
                }
            }
        }

        items[0] = item;
        return items;
    }

    static addMissingCondition(item)
    {
        const props = ItemHelper.getItem(item._tpl)[1]._props;
        const isRepairable = ("Durability" in props);
        const isMedkit = ("MaxHpResource" in props);

        if (isRepairable && props.Durability > 0)
        {
            item.upd.Repairable = {
                "Durability": props.Durability,
                "MaxDurability": props.Durability
            };
        }

        if (isMedkit && props.MaxHpResource > 0)
        {
            item.upd.MedKit = {
                "HpResource": props.MaxHpResource,
            };
        }

        return item;
    }

    static getFleaPriceForItem(tplId)
    {
        // Get dynamic price (templates/prices), if that doesnt exist get price from static array (templates/handbook)
        let itemPrice = RagfairServer.prices.dynamic[tplId];
        if (!itemPrice || itemPrice === 1)
        {
            itemPrice = RagfairServer.prices.static[tplId];
        }

        return itemPrice;
    }

    static getAllFleaPrices()
    {
        return { ...RagfairServer.prices.static, ...RagfairServer.prices.dynamic };
    }

    static getDynamicOfferPrice(items, desiredCurrency)
    {
        let price = 0;

        let endLoop = false;
        for (const item of items)
        {
            // Get dynamic price, fallback to handbook price if value of 1 found
            let itemPrice = RagfairServer.getFleaPriceForItem(item._tpl);

            // Check if item type is weapon, handle differently
            const itemDetails = ItemHelper.getItem(item._tpl);
            if (PresetController.isPreset(item._id) && itemDetails[1]._props.weapFireType)
            {
                itemPrice = RagfairServer.getWeaponPresetPrice(item, items, itemPrice);
                endLoop = true;
            }

            // Convert to different currency if desiredCurrency param is not roubles
            if (desiredCurrency !== ItemHelper.MONEY.Roubles)
            {
                itemPrice = PaymentController.fromRUB(itemPrice, desiredCurrency);
            }

            // Multiply dynamic price by quality modifier
            const itemQualityModifier = ItemHelper.getItemQualityModifier(item);
            price += itemPrice * itemQualityModifier;

            // Stop loop if weapon preset price function has been run
            if (endLoop)
            {
                break;
            }
        }

        price = Math.round(price * RandomUtil.getFloat(RagfairConfig.dynamic.price.min, RagfairConfig.dynamic.price.max));

        if (price < 1)
        {
            price = 1;
        }

        return price;
    }

    static getWeaponPresetPrice(item, items, existingPrice)
    {
        // Get all presets for this weapon type
        // If no presets found, return existing price
        const presets = PresetController.getPresets(item._tpl);
        if (!presets || presets.length === 0)
        {
            Logger.warning(`Item Id: ${item._tpl} has no presets`);
            return existingPrice;
        }

        // Get the default preset for this weapon (assumes default = has encyclopedia entry)
        // If no default preset, use first preset
        let defaultPreset = presets.find(x => x._encyclopedia);
        if (!defaultPreset)
        {
            Logger.warning(`Item Id: ${item._tpl} has no encyclopedia entry`);
            defaultPreset = presets[0];
        }

        // Get mods on current gun not in default preset
        const newOrReplacedModsInPresetVsDefault = items.filter(x => !defaultPreset._items.some(y => y._tpl === x._tpl));

        // Add up extra mods price
        let extraModsPrice = 0;
        for (const mod of newOrReplacedModsInPresetVsDefault)
        {
            extraModsPrice += RagfairServer.getFleaPriceForItem(mod._tpl);
        }

        // Only deduct cost of replaced mods if there's replaced/new mods
        if (newOrReplacedModsInPresetVsDefault.length >= 1)
        {
            // Add up cost of mods replaced
            const modsReplacedByNewMods = newOrReplacedModsInPresetVsDefault.filter(x => defaultPreset._items.some(y => y.slotId === x.slotId));

            // Add up replaced mods price
            let replacedModsPrice = 0;
            for (const replacedMod of modsReplacedByNewMods)
            {
                replacedModsPrice += RagfairServer.getFleaPriceForItem(replacedMod._tpl);
            }

            // Subtract replaced mods total from extra mods total
            extraModsPrice -= replacedModsPrice;
        }

        // return extra mods price + base gun price
        return existingPrice += extraModsPrice;
    }

    static getOfferRequirements(items)
    {
        const currency = RagfairServerHelper.getDynamicOfferCurrency();
        const price = RagfairServer.getDynamicOfferPrice(items, currency);

        return [
            {
                "count": price,
                "_tpl": currency
            }
        ];
    }

    static getBarterPrice(barterScheme)
    {
        let price = 0;

        for (const item of barterScheme)
        {
            price += (RagfairServer.prices.static[item._tpl] * item.count);
        }

        return Math.round(price);
    }

    static getOffer(offerID)
    {
        return JsonUtil.clone(RagfairServer.offers.find((item) =>
        {
            return item._id === offerID;
        }));
    }

    static getPresetItems(item)
    {
        const preset = JsonUtil.clone(DatabaseServer.tables.globals.ItemPresets[item._id]._items);
        return RagfairServer.reparentPresets(item, preset);
    }

    static getPresetItemsByTpl(item)
    {
        const presets = [];

        for (const itemId in DatabaseServer.tables.globals.ItemPresets)
        {
            if (DatabaseServer.tables.globals.ItemPresets[itemId]._items[0]._tpl === item._tpl)
            {
                const preset = JsonUtil.clone(DatabaseServer.tables.globals.ItemPresets[itemId]._items);
                presets.push(RagfairServer.reparentPresets(item, preset));
            }
        }

        return presets;
    }

    static reparentPresets(item, preset)
    {
        const oldRootId = preset[0]._id;
        const idMappings = {};

        idMappings[oldRootId] = item._id;

        for (const mod of preset)
        {
            if (idMappings[mod._id] === undefined)
            {
                idMappings[mod._id] = HashUtil.generate();
            }

            if (mod.parentId !== undefined && idMappings[mod.parentId] === undefined)
            {
                idMappings[mod.parentId] = HashUtil.generate();
            }

            mod._id =  idMappings[mod._id];

            if (mod.parentId !== undefined)
            {
                mod.parentId =  idMappings[mod.parentId];
            }
        }

        preset[0] = item;
        return preset;
    }

    static returnPlayerOffer(offer)
    {
        const pmcID = String(offer.user.id);
        const profile = ProfileController.getProfileByPmcId(pmcID);
        const sessionID = profile.aid;
        const index = profile.RagfairInfo.offers.findIndex(o => o._id === offer._id);

        profile.RagfairInfo.rating -= RagfairConfig.sell.reputation.loss;
        profile.RagfairInfo.isRatingGrowing = false;

        if (index === -1)
        {
            Logger.warning(`Could not find offer to remove with offerId -> ${offer._id}`);
            return HttpResponse.appendErrorToOutput(ItemEventRouter.getOutput(sessionID), "Offer not found in profile");
        }

        if (offer.items[0].upd.StackObjectsCount > offer.items[0].upd.OriginalStackObjectsCount)
        {
            offer.items[0].upd.StackObjectsCount = offer.items[0].upd.OriginalStackObjectsCount;
        }
        delete offer.items[0].upd.OriginalStackObjectsCount;

        RagfairController.returnItems(profile.aid, offer.items);
        profile.RagfairInfo.offers.splice(index, 1);
        RagfairServer.offers.splice(RagfairServer.offers.findIndex(o => o._id === offer._id), 1);

        return ItemEventRouter.getOutput(sessionID);
    }

    static removeOfferStack(offerID, amount)
    {
        // remove stack from offer
        for (const offer in RagfairServer.offers)
        {
            if (RagfairServer.offers[offer]._id === offerID)
            {
                // found offer
                RagfairServer.offers[offer].items[0].upd.StackObjectsCount -= amount;
                break;
            }
        }
    }

    static isExpired(offer, time)
    {
        return offer.endTime < time || offer.items[0].upd.StackObjectsCount < 1;
    }
}

module.exports = RagfairServer;

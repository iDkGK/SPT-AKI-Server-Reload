"use strict";

require("../Lib.js");

class RagfairPriceService
{
    static prices = {
        static: {},
        dynamic: {}
    };

    static generateStaticPrices()
    {
        for (const itemID in DatabaseServer.getTables().templates.items)
        {
            RagfairPriceService.prices.static[itemID] = Math.round(HandbookHelper.getTemplatePrice(itemID));
        }
    }

    static generateDynamicPrices()
    {
        Object.assign(RagfairPriceService.prices.dynamic, DatabaseServer.getTables().templates.prices);
    }

    static hasDynamicPrices()
    {
        return RagfairPriceService.prices.dynamic.length === 0;
    }

    static getDynamicPrice(itemTpl)
    {
        if (!RagfairPriceService.hasDynamicPrices())
        {
            RagfairPriceService.generateDynamicPrices();
        }

        return RagfairPriceService.prices.dynamic[itemTpl];
    }

    static getAllFleaPrices()
    {
        return { ...RagfairPriceService.prices.static, ...RagfairPriceService.prices.dynamic };
    }

    static getFleaPriceForItem(tplId)
    {
        // Get dynamic price (templates/prices), if that doesnt exist get price from static array (templates/handbook)
        let itemPrice = RagfairPriceService.prices.dynamic[tplId];
        if (!itemPrice || itemPrice === 1)
        {
            itemPrice = RagfairPriceService.prices.static[tplId];
        }

        if (!itemPrice)
        {
            Logger.debug(`Missing item price for ${tplId}`);
            itemPrice = 1;
        }

        return itemPrice;
    }

    /**
     * Check to see if an items price is below its handbook price and adjust accoring to values set to config/ragfair.json
     * @param itemPrice price of item
     * @param itemTpl item template Id being checked
     * @returns adjusted price value in roubles
     */
    static adjustPriceIfBelowHandbook(itemPrice, itemTpl)
    {
        const itemHandbookPrice = RagfairPriceService.getStaticPriceForItem(itemTpl);
        const priceDifferencePercent = RagfairPriceService.getPriceDifference(itemHandbookPrice, itemPrice);

        // Only adjust price if difference is > a percent AND item price passes threshhold set in config
        if (priceDifferencePercent > RagfairConfig.dynamic.offerAdjustment.maxPriceDifferenceBelowHandbookPercent
            && itemPrice >= RagfairConfig.dynamic.offerAdjustment.priceThreshholdRub)
        {
            //const itemDetails = ItemHelper.getItem(itemTpl);
            //Logger.debug(`item below handbook price ${itemDetails[1]._name} handbook: ${itemHandbookPrice} flea: ${itemPrice} ${priceDifferencePercent}%`);
            itemPrice = Math.round(itemHandbookPrice * RagfairConfig.dynamic.offerAdjustment.handbookPriceMultipier);
        }

        return itemPrice;
    }

    /**
     * Get the percentage difference between two values
     * @param a numerical value a
     * @param b numerical value b
     * @returns different in percent
     */
    static getPriceDifference(a, b)
    {
        return 100 * a / (a + b);
    }

    static getStaticPriceForItem(tplId)
    {
        return RagfairPriceService.prices.static[tplId];
    }

    static getBarterPrice(barterScheme)
    {
        let price = 0;

        for (const item of barterScheme)
        {
            price += (RagfairPriceService.prices.static[item._tpl] * item.count);
        }

        return Math.round(price);
    }

    static getDynamicOfferPrice(items, desiredCurrency)
    {
        let price = 0;

        let endLoop = false;
        let isPreset = false;
        for (const item of items)
        {
            // Get dynamic price, fallback to handbook price if value of 1 found
            let itemPrice = RagfairPriceService.getFleaPriceForItem(item._tpl);
            itemPrice = RagfairPriceService.adjustPriceIfBelowHandbook(itemPrice, item._tpl);

            // Check if item type is weapon, handle differently
            const itemDetails = ItemHelper.getItem(item._tpl);
            if (PresetHelper.isPreset(item._id) && itemDetails[1]._props.weapFireType)
            {
                itemPrice = RagfairPriceService.getWeaponPresetPrice(item, items, itemPrice);
                endLoop = true;
                isPreset = true;
            }

            // Convert to different currency if desiredCurrency param is not roubles
            if (desiredCurrency !== Money.ROUBLES)
            {
                itemPrice = HandbookHelper.fromRUB(itemPrice, desiredCurrency);
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

        // Use different min/max values if the item is a preset
        price = RagfairPriceService.randomisePrice(price, isPreset);

        if (price < 1)
        {
            price = 1;
        }

        return price;
    }

    /**
     * Multiply the price by a randomised curve where n = 2, shift = 2
     * @param existingPrice price to alter
     * @param isPreset is the item we're multiplying a preset
     * @returns multiplied price
     */
    static randomisePrice(existingPrice, isPreset)
    {
        const min = (isPreset)
            ? RagfairConfig.dynamic.presetPrice.min
            : RagfairConfig.dynamic.price.min;

        const max = (isPreset)
            ? RagfairConfig.dynamic.presetPrice.max
            : RagfairConfig.dynamic.price.max;

        // Multiply by 100 to get 2 decimal places of precision
        const multiplier = RandomUtil.getBiasedRandomNumber(min * 100, max * 100, 2, 2);

        // return multiplier back to its original decimal place location
        return existingPrice * (multiplier / 100);
    }

    /**
     * Calculate the cost of a weapon preset by adding together the price of its mods + base price of default weapon preset
     * @param item base weapon
     * @param items weapon plus mods
     * @param existingPrice price of existing base weapon
     * @returns
     */
    static getWeaponPresetPrice(item, items, existingPrice)
    {
        // Find all presets for this weapon type
        // If no presets found, return existing price
        const presets = PresetHelper.getPresets(item._tpl);
        if (!presets || presets.length === 0)
        {
            Logger.warning(`Item Id: ${item._tpl} has no presets`);
            return existingPrice;
        }

        // Get the default preset for this weapon
        // If no default preset, use first preset
        const defaultPreset = RagfairPriceService.getDefaultWeaponPreset(presets, item);

        // Get mods on current gun not in default preset
        const newOrReplacedModsInPresetVsDefault = items.filter(x => !defaultPreset._items.some(y => y._tpl === x._tpl));

        // Add up extra mods price
        let extraModsPrice = 0;
        for (const mod of newOrReplacedModsInPresetVsDefault)
        {
            extraModsPrice += RagfairPriceService.getFleaPriceForItem(mod._tpl);
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
                replacedModsPrice += RagfairPriceService.getFleaPriceForItem(replacedMod._tpl);
            }

            // Subtract replaced mods total from extra mods total
            extraModsPrice -= replacedModsPrice;
        }

        // return extra mods price + base gun price
        return existingPrice += extraModsPrice;
    }

    /**
     * Attempt to get the default preset for a weapon, failing that get the first preset in the array
     * (assumes default = has encyclopedia entry)
     * @param presets weapon presets to choose from
     * @returns Default preset object
     */
    static getDefaultWeaponPreset(presets, weapon)
    {
        const defaultPreset = presets.find(x => x._encyclopedia);
        if (defaultPreset)
        {
            return defaultPreset;
        }

        if (presets.length === 1)
        {
            Logger.debug(`Item Id: ${weapon._tpl} has no default encyclopedia entry but only one preset (${presets[0]._name}), choosing preset (${presets[0]._name})`);
        }
        else
        {
            Logger.debug(`Item Id: ${weapon._tpl} has no default encyclopedia entry, choosing first preset (${presets[0]._name}) of ${presets.length}`);
        }

        return presets[0];
    }
}

module.exports = RagfairPriceService;
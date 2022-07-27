"use strict";

require("../Lib");

class FenceService
{
    static fenceAssort = undefined;

    static setFenceAssort(fenceAssort)
    {
        FenceService.fenceAssort = fenceAssort;
    }

    static getFenceAssorts()
    {
        return FenceService.fenceAssort;
    }

    static generateFenceAssort(sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const fenceAssort = DatabaseServer.tables.traders[TraderHelper.TRADER.Fence].assort;
        const itemPresets = DatabaseServer.tables.globals.ItemPresets;
        const fenceAssortIds = Object.keys(fenceAssort.loyal_level_items);
        const result = {
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };
        let presetCount = 0;
        for (let i = 0; i < TraderConfig.fenceAssortSize; i++)
        {
            const itemID = fenceAssortIds[RandomUtil.getInt(0, fenceAssortIds.length - 1)];
            const price = HandbookHelper.getTemplatePrice(itemID);
            const itemIsPreset = PresetHelper.isPreset(itemID);
            if (price === 0 || (price === 1 && !itemIsPreset) || price === 100)
            {
                // don't allow "special" items
                i--;
                continue;
            }

            // it's an item
            if (!itemIsPreset)
            {
                // Skip items that are on fence ignore list
                if (TraderConfig.fenceItemIgnoreList.length > 0)
                {
                    if (ItemHelper.doesItemOrParentsIdMatch(itemID, TraderConfig.fenceItemIgnoreList)) // check blacklist against items parents
                    {
                        i--;
                        Logger.debug(`Fence: ignored item ${itemID}`);
                        continue;
                    }
                }
                // Skip quest items
                const itemDetails = ItemHelper.getItem(itemID);
                if (itemDetails[1]._props.QuestItem)
                {
                    continue;
                }
                const toPush = JsonUtil.clone(fenceAssort.items[fenceAssort.items.findIndex(i => i._id === itemID)]);
                toPush.upd.StackObjectsCount = 1;
                toPush.upd.BuyRestrictionCurrent = 0;
                toPush.upd.UnlimitedCount = false;
                toPush._id = HashUtil.generate();
                result.items.push(toPush);
                result.barter_scheme[toPush._id] = fenceAssort.barter_scheme[itemID];
                result.loyal_level_items[toPush._id] = fenceAssort.loyal_level_items[itemID];
                if (fenceAssort.barter_scheme[itemID])
                {
                    result.barter_scheme[toPush._id][0][0].count *= FenceService.getFenceInfo(pmcData).PriceModifier;
                }
                continue;
            }

            // it's itemPreset
            if (presetCount > TraderConfig.fenceMaxPresetsCount)
            {
                continue;
            }

            if (result.items.some(i => i.upd && i.upd.sptPresetId === itemID))
            {
                // Duplicate preset, skip it
                continue;
            }
            const items = ItemHelper.replaceIDs(null, JsonUtil.clone(itemPresets[itemID]._items));
            let rub = 0;
            for (let i = 0; i < items.length; i++)
            {
                const mod = items[i];
                //build root Item info
                if (!("parentId" in mod))
                {
                    mod._id = items[0]._id;
                    mod.parentId = "hideout";
                    mod.slotId = "hideout";
                    mod.upd = {
                        UnlimitedCount: false,
                        StackObjectsCount: 1,
                        sptPresetId: itemID // store preset id here so we can check it later to prevent preset dupes
                    };
                }
            }
            result.items.push(...items);
            // calculate preset price
            for (const it of items)
            {
                rub += HandbookHelper.getTemplatePrice(it._tpl);
            }
            result.barter_scheme[items[0]._id] = fenceAssort.barter_scheme[itemID];
            result.loyal_level_items[items[0]._id] = fenceAssort.loyal_level_items[itemID];
            if (fenceAssort.barter_scheme[itemID])
            {
                result.barter_scheme[items[0]._id][0][0].count = rub * FenceService.getFenceInfo(pmcData).PriceModifier * TraderConfig.fencePresetPriceMult;
            }
            presetCount++;
        }
        FenceService.setFenceAssort(result);
    }

    /**
     *
     * @param pmcData Get the fence level the passed in profile has
     * @returns FenceLevel
     */
    static getFenceInfo(pmcData)
    {
        const fenceSettings = DatabaseServer.tables.globals.config.FenceSettings;
        const pmcFenceInfo = pmcData.TradersInfo[fenceSettings.FenceId];
        if (!pmcFenceInfo)
        {
            return fenceSettings.Levels["0"];
        }
        const fenceLevels = (Object.keys(fenceSettings.Levels)).map((value) => Number.parseInt(value));
        const minLevel = Math.min(...fenceLevels);
        const maxLevel = Math.max(...fenceLevels);
        const pmcFenceLevel = Math.floor(pmcFenceInfo.standing);
        if (pmcFenceLevel < minLevel)
        {
            return fenceSettings.Levels[minLevel.toString()];
        }

        if (pmcFenceLevel > maxLevel)
        {
            return fenceSettings.Levels[maxLevel.toString()];
        }
        return fenceSettings.Levels[pmcFenceLevel.toString()];
    }

    static removeFenceOffer(assortIdToRemove)
    {
        const relatedAssortIndex = FenceService.fenceAssort.items.findIndex(i => i._id === assortIdToRemove);
        FenceService.fenceAssort.items.splice(relatedAssortIndex, 1);
    }
}

module.exports = FenceService;
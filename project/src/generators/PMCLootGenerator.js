"use strict";

require("../Lib.js");

class PMCLootGenerator
{
    static pocketLootPool = [];
    static backpackLootPool = [];

    static generatePMCPocketLootPool()
    {
        const items = DatabaseServer.getTables().templates.items;

        const allowedItemTypes = BotConfig.pmc.dynamicLoot.whitelist;
        const itemBlacklist = BotConfig.pmc.dynamicLoot.blacklist;

        // Hydrate loot dictionary if empty
        if (Object.keys(PMCLootGenerator.pocketLootPool).length === 0)
        {
            const itemsToAdd = Object.values(items).filter(
                item =>
                    allowedItemTypes.includes(item._parent) &&
                    ItemHelper.isValidItem(item._id) &&
                    !itemBlacklist.includes(item._id) &&
                    item._props.Width === 1 &&
                    item._props.Height === 1
            );

            PMCLootGenerator.pocketLootPool = itemsToAdd.map(x => x._id);
        }

        return PMCLootGenerator.pocketLootPool;
    }

    static generatePMCBackpackLootPool()
    {
        const items = DatabaseServer.getTables().templates.items;

        const allowedItemTypes = BotConfig.pmc.dynamicLoot.whitelist;
        const itemBlacklist = BotConfig.pmc.dynamicLoot.blacklist;

        // Hydrate loot dictionary if empty
        if (Object.keys(PMCLootGenerator.backpackLootPool).length === 0)
        {
            const itemsToAdd = Object.values(items).filter(
                item =>
                    allowedItemTypes.includes(item._parent) &&
                    ItemHelper.isValidItem(item._id) &&
                    !itemBlacklist.includes(item._id)
            );

            PMCLootGenerator.backpackLootPool = itemsToAdd.map(x => x._id);
        }

        return PMCLootGenerator.backpackLootPool;
    }
}

module.exports = PMCLootGenerator;

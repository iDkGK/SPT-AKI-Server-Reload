"use strict";

require("../Lib.js");

class BotEquipmentFilterService
{
    static get botEquipmentFilterlists()
    {
        return BotConfig.equipment;
    }

    /**
     * Filter a bots data to exclude equipment and cartridges defines in the botConfig
     * @param baseBotNode bots json data to filter
     * @param playerLevel Level of the currently playing player
     * @param isPmc Is the bot we're filtering a PMC
     * @param role Role of the bot we're filtering
     */
    static filterBotEquipment(baseBotNode, playerLevel, isPmc, role)
    {
        const botRole = (isPmc) ? "pmc" : role;
        const botEquipmentBlacklist = BotEquipmentFilterService.getBotEquipmentBlacklist(botRole, playerLevel);
        const botEquipmentWhitelist = BotEquipmentFilterService.getBotEquipmentWhitelist(botRole, playerLevel);
        BotEquipmentFilterService.filterEquipment(baseBotNode, botEquipmentBlacklist, botEquipmentWhitelist);
        BotEquipmentFilterService.filterCartridges(baseBotNode, botEquipmentBlacklist, botEquipmentWhitelist);
    }

    /**
     * Get an object that contains equipment and cartridge blacklists for a specified bot type
     * @param botRole Role of the bot we want the blacklist for
     * @param playerLevel Level of the player
     * @returns EquipmentBlacklistDetails object
     */
    static getBotEquipmentBlacklist(botRole, playerLevel)
    {
        const blacklistDetailsForBot = BotEquipmentFilterService.botEquipmentFilterlists[botRole];

        // No equipment blacklist found, skip
        if (!blacklistDetailsForBot || Object.keys(blacklistDetailsForBot).length === 0)
        {
            return null;
        }

        return BotEquipmentFilterService.botEquipmentFilterlists[botRole].blacklist.find(x => playerLevel >= x.levelRange.min && playerLevel <= x.levelRange.max);
    }

    /**
     * Get the whitelist for a specific bot type that's within the players level
     * @param botRole Bot type
     * @param playerLevel Players level
     * @returns EquipmentFilterDetails object
     */
    static getBotEquipmentWhitelist(botRole, playerLevel)
    {
        const whitelistDetailsForBot = BotEquipmentFilterService.botEquipmentFilterlists[botRole];

        // No equipment blacklist found, skip
        if (!whitelistDetailsForBot || Object.keys(whitelistDetailsForBot).length === 0)
        {
            return null;
        }

        return BotEquipmentFilterService.botEquipmentFilterlists[botRole].whitelist.find(x => playerLevel >= x.levelRange.min && playerLevel <= x.levelRange.max);
    }

    /**
     * Filter bot equipment based on blacklist and whitelist from config/bot.json
     * Prioritises whitelist first, if one is found blacklist is ignored
     * @param baseBotNode bot .json file to update
     * @param blacklist equipment blacklist
     * @returns Filtered bot file
     */
    static filterEquipment(baseBotNode, blacklist, whitelist)
    {
        if (whitelist)
        {
            for (const equipmentSlotKey in baseBotNode.inventory.equipment)
            {
                const botEquipment = baseBotNode.inventory.equipment[equipmentSlotKey];

                // Skip equipment slot if whitelist doesnt exist / is empty
                const whitelistEquipmentForSlot = whitelist.equipment[equipmentSlotKey];
                if (!whitelistEquipmentForSlot || Object.keys(whitelistEquipmentForSlot).length === 0)
                {
                    continue;
                }

                // Filter equipment slot items to just items in whitelist
                baseBotNode.inventory.equipment[equipmentSlotKey] = Object.keys(botEquipment).filter((tpl) => whitelistEquipmentForSlot.includes(tpl)).reduce((res, key) => (res[key] = botEquipment[key], res), {});
            }

            return;
        }

        if (blacklist)
        {
            for (const equipmentSlotKey in baseBotNode.inventory.equipment)
            {
                const botEquipment = baseBotNode.inventory.equipment[equipmentSlotKey];

                // Skip equipment slot if blacklist doesnt exist / is empty
                const equipmentSlotBlacklist = blacklist.equipment[equipmentSlotKey];
                if (!equipmentSlotBlacklist || Object.keys(equipmentSlotBlacklist).length === 0)
                {
                    continue;
                }

                // Filter equipment slot items to just items not in blacklist
                baseBotNode.inventory.equipment[equipmentSlotKey] = Object.keys(botEquipment).filter((tpl) => !equipmentSlotBlacklist.includes(tpl)).reduce((res, key) => (res[key] = botEquipment[key], res), {});
            }
        }
    }

    /**
     * Filter bot cartridges based on blacklist and whitelist from config/bot.json
     * Prioritises whitelist first, if one is found blacklist is ignored
     * @param baseBotNode bot .json file to update
     * @param blacklist equipment on this list should be excluded from the bot
     * @param whitelist equipment on this list should be used exclusivly
     * @returns Filtered bot file
     */
    static filterCartridges(baseBotNode, blacklist, whitelist)
    {
        if (whitelist)
        {
            for (const ammoCaliberKey in baseBotNode.inventory.Ammo)
            {
                const botAmmo = baseBotNode.inventory.Ammo[ammoCaliberKey];

                // Skip cartridge slot if whitelist doesnt exist / is empty
                const whiteListedCartridgesForCaliber = whitelist.cartridge[ammoCaliberKey];
                if (!whiteListedCartridgesForCaliber || Object.keys(whiteListedCartridgesForCaliber).length === 0)
                {
                    continue;
                }

                // Filter caliber slot items to just items in whitelist
                baseBotNode.inventory.Ammo[ammoCaliberKey] = Object.keys(botAmmo).filter((tpl) => whitelist.cartridge[ammoCaliberKey].includes(tpl)).reduce((res, key) => (res[key] = botAmmo[key], res), {});
            }

            return;
        }

        if (blacklist)
        {
            for (const ammoCaliberKey in baseBotNode.inventory.Ammo)
            {
                const botAmmo = baseBotNode.inventory.Ammo[ammoCaliberKey];

                // Skip cartridge slot if blacklist doesnt exist / is empty
                const cartridgeCaliberBlacklist = blacklist.cartridge[ammoCaliberKey];
                if (!cartridgeCaliberBlacklist || Object.keys(cartridgeCaliberBlacklist).length === 0)
                {
                    continue;
                }

                // Filter cartridge slot items to just items not in blacklist
                baseBotNode.inventory.Ammo[ammoCaliberKey] = Object.keys(botAmmo).filter((tpl) => !cartridgeCaliberBlacklist.includes(tpl)).reduce((res, key) => (res[key] = botAmmo[key], res), {});
            }
        }
    }
}

module.exports = BotEquipmentFilterService;

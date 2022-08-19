"use strict";

require("../Lib.js");

class BotLootCacheService
{
    static lootCache = {};

    /**
     * Remove all cached bot loot data
     */
    static clearCache()
    {
        BotLootCacheService.lootCache = {};
    }

    /**
     * Get the fully created loot array, ordered by price low to high
     * @param botRole bot to get loot for
     * @param isPmc is the bot a pmc
     * @param lootType what type of loot is needed (backpack/pocket/stim/vest etc)
     * @param lootPool the full pool of loot (needed when cache is empty)
     * @returns ITemplateItem array
     */
    static getLootFromCache(botRole, isPmc, lootType, lootPool)
    {
        if (!BotLootCacheService.botRoleExistsInCache(botRole))
        {
            BotLootCacheService.initCacheForBotRole(botRole);
            BotLootCacheService.addLootToCache(botRole, isPmc, lootPool);
        }

        switch (lootType)
        {
            case LootCacheType.SPECIAL:
                return BotLootCacheService.lootCache[botRole].specialItems;
            case LootCacheType.BACKPACK:
                return BotLootCacheService.lootCache[botRole].backpackLoot;
            case LootCacheType.POCKET:
                return BotLootCacheService.lootCache[botRole].pocketLoot;
            case LootCacheType.VEST:
                return BotLootCacheService.lootCache[botRole].vestLoot;
            case LootCacheType.COMBINED:
                return BotLootCacheService.lootCache[botRole].combinedPoolLoot;
            case LootCacheType.HEALING_ITEMS:
                return BotLootCacheService.lootCache[botRole].healingItems;
            case LootCacheType.GRENADE_ITEMS:
                return BotLootCacheService.lootCache[botRole].grenadeItems;
            case LootCacheType.DRUG_ITEMS:
                return BotLootCacheService.lootCache[botRole].drugItems;
            case LootCacheType.STIM_ITEMS:
                return BotLootCacheService.lootCache[botRole].stimItems;
            default:
                Logger.error(`loot cache failed for loot: ${lootType} on bot: ${botRole}, was a pmc: ${isPmc}`);
                break;
        }
    }

    /**
     * Generate loot for a bot and store inside a private class property
     * @param botRole bots role (assault / pmcBot etc)
     * @param lootPool the full pool of loot we use to create the various sub-categories with
     * @param isPmc Is the bot a PMC (alteres what loot is cached)
     */
    static addLootToCache(botRole, isPmc, lootPool)
    {
        // Flatten all individual slot loot pools into one big pool, while filtering out potentially missing templates
        const specialLootTemplates = [];
        const backpackLootTemplates = [];
        const pocketLootTemplates = [];
        const vestLootTemplates = [];
        const combinedPoolTemplates = [];

        if (isPmc)
        {
            // replace lootPool passed in with our own generated list if bot is a pmc
            lootPool.Backpack = JsonUtil.clone(PMCLootGenerator.generatePMCBackpackLootPool());
            lootPool.Pockets = JsonUtil.clone(PMCLootGenerator.generatePMCPocketLootPool());
            lootPool.TacticalVest = JsonUtil.clone(PMCLootGenerator.generatePMCPocketLootPool());
        }

        for (const [slot, pool] of Object.entries(lootPool))
        {
            if (!pool || !pool.length)
            {
                continue;
            }

            let poolItems = [];
            switch (slot.toLowerCase())
            {
                case "specialloot":
                    poolItems = pool.map(lootTpl => DatabaseServer.getTables().templates.items[lootTpl]);
                    specialLootTemplates.push(...poolItems.filter(x => !!x));
                    break;
                case "pockets":
                    poolItems = pool.map(lootTpl => DatabaseServer.getTables().templates.items[lootTpl]);
                    pocketLootTemplates.push(...poolItems.filter(x => !!x));
                    break;
                case "tacticalvest":
                    poolItems = pool.map(lootTpl => DatabaseServer.getTables().templates.items[lootTpl]);
                    vestLootTemplates.push(...poolItems.filter(x => !!x));
                    break;
                case "securedcontainer":
                    // Don't add these items to loot pool
                    break;
                default:
                    poolItems = pool.map(lootTpl => DatabaseServer.getTables().templates.items[lootTpl]);
                    backpackLootTemplates.push(...poolItems.filter(x => !!x));
            }

            if (Object.keys(poolItems).length > 0)
            {
                combinedPoolTemplates.push(...poolItems.filter(x => !!x));
            }
        }

        // Sort all items by their worth
        specialLootTemplates.sort((a, b) => BotLootCacheService.compareByValue(RagfairPriceService.getFleaPriceForItem(a._id), RagfairPriceService.getFleaPriceForItem(b._id)));
        backpackLootTemplates.sort((a, b) => BotLootCacheService.compareByValue(RagfairPriceService.getFleaPriceForItem(a._id), RagfairPriceService.getFleaPriceForItem(b._id)));
        pocketLootTemplates.sort((a, b) => BotLootCacheService.compareByValue(RagfairPriceService.getFleaPriceForItem(a._id), RagfairPriceService.getFleaPriceForItem(b._id)));
        vestLootTemplates.sort((a, b) => BotLootCacheService.compareByValue(RagfairPriceService.getFleaPriceForItem(a._id), RagfairPriceService.getFleaPriceForItem(b._id)));
        combinedPoolTemplates.sort((a, b) => BotLootCacheService.compareByValue(RagfairPriceService.getFleaPriceForItem(a._id), RagfairPriceService.getFleaPriceForItem(b._id)));

        const specialLootItems = specialLootTemplates.filter(template =>
            !BotLootCacheService.isBulletOrGrenade(template._props)
            && !BotLootCacheService.isMagazine(template._props));

        const healingItems = combinedPoolTemplates.filter(template =>
            BotLootCacheService.isMedicalItem(template._props)
            && template._parent !== BaseClasses.STIMULATOR
            && template._parent !== BaseClasses.DRUGS);

        const drugItems = combinedPoolTemplates.filter(template =>
            BotLootCacheService.isMedicalItem(template._props)
            && template._parent === BaseClasses.DRUGS);

        const stimItems = combinedPoolTemplates.filter(template =>
            BotLootCacheService.isMedicalItem(template._props)
            && template._parent === BaseClasses.STIMULATOR);

        const grenadeItems = combinedPoolTemplates.filter(template =>
            BotLootCacheService.isGrenade(template._props));

        // Get loot items (excluding magazines, bullets, grenades and healing items)
        const backpackLootItems = backpackLootTemplates.filter(template =>
            !BotLootCacheService.isBulletOrGrenade(template._props)
            && !BotLootCacheService.isMagazine(template._props)
            && !BotLootCacheService.isMedicalItem(template._props)
            && !BotLootCacheService.isGrenade(template._props));

        // Get pocket loot
        const pocketLootItems = pocketLootTemplates.filter(template =>
            !BotLootCacheService.isBulletOrGrenade(template._props)
            && !BotLootCacheService.isMagazine(template._props)
            && !BotLootCacheService.isMedicalItem(template._props)
            && !BotLootCacheService.isGrenade(template._props)
            && ("Height" in template._props)
            && ("Width" in template._props));

        // Get vest loot items
        const vestLootItems = vestLootTemplates.filter(template =>
            !BotLootCacheService.isBulletOrGrenade(template._props)
            && !BotLootCacheService.isMagazine(template._props)
            && !BotLootCacheService.isMedicalItem(template._props)
            && !BotLootCacheService.isGrenade(template._props));

        BotLootCacheService.lootCache[botRole].healingItems = healingItems;
        BotLootCacheService.lootCache[botRole].drugItems = drugItems;
        BotLootCacheService.lootCache[botRole].stimItems = stimItems;
        BotLootCacheService.lootCache[botRole].grenadeItems = grenadeItems;

        BotLootCacheService.lootCache[botRole].specialItems = specialLootItems;
        BotLootCacheService.lootCache[botRole].backpackLoot = backpackLootItems;
        BotLootCacheService.lootCache[botRole].pocketLoot = pocketLootItems;
        BotLootCacheService.lootCache[botRole].vestLoot = vestLootItems;
    }

    /**
     * Ammo/grenades have this property
     * @param props
     * @returns
     */
    static isBulletOrGrenade(props)
    {
        return ("ammoType" in props);
    }

    /**
     * Internal and external magazine have this property
     * @param props
     * @returns
     */
    static isMagazine(props)
    {
        return ("ReloadMagType" in props);
    }

    /**
     * Medical use items (e.g. morphine/lip balm/grizzly)
     * @param props
     * @returns
     */
    static isMedicalItem(props)
    {
        return ("medUseTime" in props);
    }

    /**
     * Grenades have this property (e.g. smoke/frag/flash grenades)
     * @param props
     * @returns
     */
    static isGrenade(props)
    {
        return ("ThrowType" in props);
    }

    /**
     * Check if a bot type exists inside the loot cache
     * @param botRole role to check for
     * @returns true if they exist
     */
    static botRoleExistsInCache(botRole)
    {
        return !!BotLootCacheService.lootCache[botRole];
    }

    /**
     * If lootcache is null, init with empty property arrays
     * @param botRole Bot role to hydrate
     */
    static initCacheForBotRole(botRole)
    {
        BotLootCacheService.lootCache[botRole] = {
            backpackLoot: [],
            pocketLoot: [],
            vestLoot: [],
            combinedPoolLoot: [],

            specialItems: [],
            grenadeItems: [],
            drugItems: [],
            healingItems: [],
            stimItems: []
        };
    }

    /**
     * Compares two item prices by their flea (or handbook if that doesnt exist) price
     * -1 when a < b
     * 0 when a === b
     * 1 when a > b
     * @param itemAPrice
     * @param itemBPrice
     * @returns
     */
    static compareByValue(itemAPrice, itemBPrice)
    {
        // If item A has no price, it should be moved to the back when sorting
        if (!itemAPrice)
        {
            return 1;
        }

        if (!itemBPrice)
        {
            return -1;
        }

        if (itemAPrice < itemBPrice)
        {
            return -1;
        }

        if (itemAPrice > itemBPrice)
        {
            return 1;
        }

        return 0;
    }

}

module.exports = BotLootCacheService;

"use strict";

require("../Lib.js");

class BotLootGenerator
{
    static generateLoot(
        templateInventory,
        itemCounts,
        isPmc,
        botRole,
        botInventory,
        equipmentChances
    )
    {
        const lootPool = templateInventory.items;

        const nValue = BotLootGenerator.getBotLootNValue(isPmc);
        const looseLootMin = itemCounts.looseLoot.min;
        const looseLootMax = itemCounts.looseLoot.max;

        const lootItemCount = BotLootGenerator.getRandomisedCount(
            looseLootMin,
            looseLootMax,
            nValue
        );
        const pocketLootCount = BotLootGenerator.getRandomisedCount(
            1,
            4,
            nValue
        );
        const vestLootCount = BotLootGenerator.getRandomisedCount(
            Math.round(looseLootMin / 2),
            Math.round(looseLootMax / 2),
            nValue
        ); // Count is half what loose loot min/max is
        const specialLootItemCount = BotLootGenerator.getRandomisedCount(
            itemCounts.specialItems.min,
            itemCounts.specialItems.max,
            nValue
        );

        const healingItemCount = BotLootGenerator.getRandomisedCount(
            itemCounts.healing.min,
            itemCounts.healing.max,
            3
        );
        const drugItemCount = BotLootGenerator.getRandomisedCount(
            itemCounts.drugs.min,
            itemCounts.drugs.max,
            3
        );
        const stimItemCount = BotLootGenerator.getRandomisedCount(
            itemCounts.stims.min,
            itemCounts.stims.max,
            3
        );
        const grenadeCount = BotLootGenerator.getRandomisedCount(
            itemCounts.grenades.min,
            itemCounts.grenades.max,
            4
        );

        // Special items
        BotLootGenerator.addLootFromPool(
            BotLootCacheService.getLootFromCache(
                botRole,
                isPmc,
                LootCacheType.SPECIAL,
                lootPool
            ),
            [
                EquipmentSlots.POCKETS,
                EquipmentSlots.BACKPACK,
                EquipmentSlots.TACTICAL_VEST,
            ],
            specialLootItemCount,
            botInventory,
            botRole
        );

        // Meds
        BotLootGenerator.addLootFromPool(
            BotLootCacheService.getLootFromCache(
                botRole,
                isPmc,
                LootCacheType.HEALING_ITEMS,
                lootPool
            ),
            [
                EquipmentSlots.TACTICAL_VEST,
                EquipmentSlots.POCKETS,
                EquipmentSlots.BACKPACK,
                EquipmentSlots.SECURED_CONTAINER,
            ],
            healingItemCount,
            botInventory,
            botRole,
            false,
            0,
            isPmc
        );

        // Drugs
        BotLootGenerator.addLootFromPool(
            BotLootCacheService.getLootFromCache(
                botRole,
                isPmc,
                LootCacheType.DRUG_ITEMS,
                lootPool
            ),
            [
                EquipmentSlots.TACTICAL_VEST,
                EquipmentSlots.POCKETS,
                EquipmentSlots.BACKPACK,
                EquipmentSlots.SECURED_CONTAINER,
            ],
            drugItemCount,
            botInventory,
            botRole,
            false,
            0,
            isPmc
        );

        // Stims
        BotLootGenerator.addLootFromPool(
            BotLootCacheService.getLootFromCache(
                botRole,
                isPmc,
                LootCacheType.STIM_ITEMS,
                lootPool
            ),
            [
                EquipmentSlots.TACTICAL_VEST,
                EquipmentSlots.POCKETS,
                EquipmentSlots.BACKPACK,
                EquipmentSlots.SECURED_CONTAINER,
            ],
            stimItemCount,
            botInventory,
            botRole,
            true,
            0,
            isPmc
        );

        // Grenades
        BotLootGenerator.addLootFromPool(
            BotLootCacheService.getLootFromCache(
                botRole,
                isPmc,
                LootCacheType.GRENADE_ITEMS,
                lootPool
            ),
            [EquipmentSlots.TACTICAL_VEST, EquipmentSlots.POCKETS],
            grenadeCount,
            botInventory,
            botRole,
            false,
            0,
            isPmc
        );

        if (
            isPmc &&
            RandomUtil.getInt(0, 99) <
                BotConfig.pmc.looseWeaponInBackpackChancePercent
        )
        {
            BotLootGenerator.addLooseWeaponsToInventorySlot(
                botInventory,
                "Backpack",
                templateInventory,
                equipmentChances.mods,
                botRole,
                isPmc
            );
        }

        // Backpack
        BotLootGenerator.addLootFromPool(
            BotLootCacheService.getLootFromCache(
                botRole,
                isPmc,
                LootCacheType.BACKPACK,
                lootPool
            ),
            [EquipmentSlots.BACKPACK],
            lootItemCount,
            botInventory,
            botRole,
            true,
            BotConfig.pmc.maxBackpackLootTotalRub,
            isPmc
        );

        // Vest
        BotLootGenerator.addLootFromPool(
            BotLootCacheService.getLootFromCache(
                botRole,
                isPmc,
                LootCacheType.VEST,
                lootPool
            ),
            [EquipmentSlots.TACTICAL_VEST],
            vestLootCount,
            botInventory,
            botRole,
            true,
            BotConfig.pmc.maxVestLootTotalRub,
            isPmc
        );

        // Pockets
        BotLootGenerator.addLootFromPool(
            BotLootCacheService.getLootFromCache(
                botRole,
                isPmc,
                LootCacheType.POCKET,
                lootPool
            ),
            [EquipmentSlots.POCKETS],
            pocketLootCount,
            botInventory,
            botRole,
            true,
            BotConfig.pmc.maxPocketLootTotalRub,
            isPmc
        );
    }

    static getRandomisedCount(min, max, nValue)
    {
        const range = max - min;
        return RandomUtil.getBiasedRandomNumber(min, max, range, nValue);
    }

    /**
     * Take random items from a pool and add to an inventory until totalItemCount or totalValueLimit is reached
     * @param pool pool of items to pick from
     * @param equipmentSlots What equality slot will the loot items be added to
     * @param totalItemCount Max count of items to add
     * @param inventoryToAddItemsTo bot inventory loot will be added to
     * @param botRole role of the bot loot is being generated for (assault/pmcbot)
     * @param useLimits should item limit counts be used as defined in config/bot.json
     * @param totalValueLimitRub total value of loot allowed in roubles
     * @param isPmc is the bot being generated for a pmc
     */
    static addLootFromPool(
        pool,
        equipmentSlots,
        totalItemCount,
        inventoryToAddItemsTo,
        botRole,
        useLimits = false,
        totalValueLimitRub = 0,
        isPmc = false
    )
    {
        // Loot pool has items
        if (pool.length)
        {
            let currentTotalRub = 0;
            const itemLimits = {};
            const itemSpawnLimits = {};
            for (let i = 0; i < totalItemCount; i++)
            {
                const itemToAddTemplate =
                    BotLootGenerator.getRandomItemFromPool(pool, isPmc);
                const id = HashUtil.generate();
                const itemsToAdd = [
                    {
                        _id: id,
                        _tpl: itemToAddTemplate._id,
                        ...BotGeneratorHelper.generateExtraPropertiesForItem(
                            itemToAddTemplate
                        ),
                    },
                ];

                if (useLimits)
                {
                    if (Object.keys(itemLimits).length === 0)
                    {
                        BotLootGenerator.initItemLimitArray(
                            isPmc,
                            botRole,
                            itemLimits
                        );
                    }

                    if (!itemSpawnLimits[botRole])
                    {
                        itemSpawnLimits[botRole] =
                            BotLootGenerator.getItemSpawnLimitsForBotType(
                                isPmc,
                                botRole
                            );
                    }

                    if (
                        BotLootGenerator.itemHasReachedSpawnLimit(
                            itemToAddTemplate,
                            botRole,
                            isPmc,
                            itemLimits,
                            itemSpawnLimits[botRole]
                        )
                    )
                    {
                        i--;
                        continue;
                    }
                }

                // Fill ammo box
                if (BotLootGenerator.isAmmoBox(itemToAddTemplate._props))
                {
                    itemsToAdd.push(
                        BotLootGenerator.createAmmoForAmmoBox(
                            id,
                            itemToAddTemplate._props
                        )
                    );
                }

                // make money a stack
                if (itemToAddTemplate._parent === BaseClasses.MONEY)
                {
                    BotLootGenerator.randomiseMoneyStackSize(
                        isPmc,
                        itemToAddTemplate,
                        itemsToAdd[0]
                    );
                }

                // Make ammo a stack
                if (itemToAddTemplate._parent === BaseClasses.AMMO)
                {
                    BotLootGenerator.randomiseAmmoStackSize(
                        isPmc,
                        itemToAddTemplate,
                        itemsToAdd[0]
                    );
                }

                BotGeneratorHelper.addItemWithChildrenToEquipmentSlot(
                    equipmentSlots,
                    id,
                    itemToAddTemplate._id,
                    itemsToAdd,
                    inventoryToAddItemsTo
                );

                // Stop adding items to bots pool if rolling total is over total limit
                if (totalValueLimitRub > 0)
                {
                    currentTotalRub += HandbookHelper.getTemplatePrice(
                        itemToAddTemplate._id
                    );
                    if (currentTotalRub > totalValueLimitRub)
                    {
                        break;
                    }
                }
            }
        }
    }

    /**
     * Add generated weapons to inventory as loot
     * @param botInventory inventory to add preset to
     * @param equipmentSlot slot to place the preset in (backpack)
     * @param templateInventory bots template, assault.json
     * @param modChances chances for mods to spawn on weapon
     * @param botRole bots role, .e.g. pmcBot
     * @param isPmc are we generating for a pmc
     */
    static addLooseWeaponsToInventorySlot(
        botInventory,
        equipmentSlot,
        templateInventory,
        modChances,
        botRole,
        isPmc
    )
    {
        const chosenWeaponType = RandomUtil.getArrayValue([
            EquipmentSlots.FIRST_PRIMARY_WEAPON,
            EquipmentSlots.FIRST_PRIMARY_WEAPON,
            EquipmentSlots.FIRST_PRIMARY_WEAPON,
            EquipmentSlots.HOLSTER,
        ]);
        const randomisedWeaponCount = RandomUtil.getInt(
            BotConfig.pmc.looseWeaponInBackpackLootMinMax.min,
            BotConfig.pmc.looseWeaponInBackpackLootMinMax.max
        );
        if (randomisedWeaponCount > 0)
        {
            for (let i = 0; i < randomisedWeaponCount; i++)
            {
                const generatedWeapon = BotWeaponGenerator.generateRandomWeapon(
                    chosenWeaponType,
                    templateInventory,
                    botInventory.equipment,
                    modChances,
                    botRole,
                    isPmc
                );
                BotGeneratorHelper.addItemWithChildrenToEquipmentSlot(
                    [equipmentSlot],
                    generatedWeapon.weapon[0]._id,
                    generatedWeapon.weapon[0]._tpl,
                    [...generatedWeapon.weapon],
                    botInventory
                );
            }
        }
    }

    /**
     * Get a random item from the pool parameter using the biasedRandomNumber system
     * @param pool pool of items to pick an item from
     * @param isPmc is the bot being created a pmc
     * @returns ITemplateItem object
     */
    static getRandomItemFromPool(pool, isPmc)
    {
        const itemIndex = RandomUtil.getBiasedRandomNumber(
            0,
            pool.length - 1,
            pool.length - 1,
            BotLootGenerator.getBotLootNValue(isPmc)
        );
        return pool[itemIndex];
    }

    /**
     * Get the loot nvalue from botconfig
     * @param isPmc if true the pmc nvalue is returned
     * @returns nvalue as number
     */
    static getBotLootNValue(isPmc)
    {
        if (isPmc)
        {
            return BotConfig.lootNValue["pmc"];
        }

        return BotConfig.lootNValue["scav"];
    }

    /**
     * Update item limit array to contain items that have a limit
     * All values are set to 0
     * @param isPmc is the bot a pmc
     * @param botRole role the bot has
     * @param limitCount
     */
    static initItemLimitArray(isPmc, botRole, limitCount)
    {
        // Init current count of items we want to limit
        const spawnLimits = BotLootGenerator.getItemSpawnLimitsForBotType(
            isPmc,
            botRole
        );
        for (const limit in spawnLimits)
        {
            limitCount[limit] = 0;
        }
    }

    /**
     * Check if an item has reached its bot-specific spawn limit
     * @param itemTemplate Item we check to see if its reached spawn limit
     * @param botRole Bot type
     * @param isPmc Is bot we're working with a pmc
     * @param limitCount spawn limits for items on bot
     * @param itemSpawnLimits the limits this bot is allowed to have
     * @returns true if item has reached spawn limit
     */
    static itemHasReachedSpawnLimit(
        itemTemplate,
        botRole,
        isPmc,
        limitCount,
        itemSpawnLimits
    )
    {
        // PMCs and scavs have different sections of bot config for spawn limits
        if (!!itemSpawnLimits && itemSpawnLimits.length === 0)
        {
            // No items found in spawn limit, drop out
            return false;
        }

        // No spawn limits, skipping
        if (!itemSpawnLimits)
        {
            return false;
        }

        const idToCheckFor = BotLootGenerator.getMatchingIdFromSpawnLimits(
            itemTemplate,
            itemSpawnLimits
        );
        if (!idToCheckFor)
        {
            // ParentId or tplid not found in spawnLimits, not a spawn limited item, skip
            return false;
        }

        // Increment item count with this bot type
        limitCount[idToCheckFor]++;

        // return true, we are over limit
        if (limitCount[idToCheckFor] > itemSpawnLimits[idToCheckFor])
        {
            if (limitCount[idToCheckFor] > itemSpawnLimits[idToCheckFor] * 10)
            {
                Logger.warning(
                    `${botRole} Unable to spawn item ${itemTemplate._name} after ${limitCount[idToCheckFor]} attempts, ignoring spawn limit`
                );
                return false;
            }

            return true;
        }

        return false;
    }

    /**
     * Is the item an ammo box
     * @param props props of the item to check
     * @returns true if item is an ammo box
     */
    static isAmmoBox(props)
    {
        return !!props.StackSlots && !!props.StackSlots.length;
    }

    /**
     * Create an object that contains the ammo stack for an ammo box
     * @param parentId ammo box id
     * @param props ammo box props
     * @returns Item object
     */
    static createAmmoForAmmoBox(parentId, props)
    {
        return {
            _id: HashUtil.generate(),
            _tpl: RandomUtil.getArrayValue(
                props.StackSlots[0]._props.filters[0].Filter
            ),
            parentId: parentId,
            slotId: "cartridges",
            upd: { StackObjectsCount: props.StackMaxRandom },
        };
    }

    /**
     * Randomise the stack size of a money object, uses different values for pmc or scavs
     * @param isPmc is this a PMC
     * @param itemTemplate item details
     * @param moneyItem Money stack to randomise
     */
    static randomiseMoneyStackSize(isPmc, itemTemplate, moneyItem)
    {
        // Only add if no upd or stack objects exist - preserves existing stack count
        if (!moneyItem.upd || !moneyItem.upd.StackObjectsCount)
        {
            // PMCs have a different stack max size
            const minStackSize = itemTemplate._props.StackMinRandom;
            const maxStackSize = isPmc
                ? BotConfig.pmc.dynamicLoot.moneyStackLimits[itemTemplate._id]
                : itemTemplate._props.StackMaxRandom;

            moneyItem.upd = {
                StackObjectsCount: RandomUtil.getInt(
                    minStackSize,
                    maxStackSize
                ),
            };
        }
    }

    /**
     * Randomise the size of an ammo stack
     * @param isPmc is this a PMC
     * @param itemTemplate item details
     * @param ammoItem Ammo stack to randomise
     */
    static randomiseAmmoStackSize(isPmc, itemTemplate, ammoItem)
    {
        // only add if no upd or stack objects exist - preserves existing stack count
        if (!ammoItem.upd || !ammoItem.upd.StackObjectsCount)
        {
            const minStackSize = itemTemplate._props.StackMinRandom;
            const maxStackSize = itemTemplate._props.StackMaxSize;

            ammoItem.upd = {
                StackObjectsCount: RandomUtil.getInt(
                    minStackSize,
                    maxStackSize
                ),
            };
        }
    }

    /**
     * Get spawn limits for a specific bot type from bot.json config
     * If no limit found for a non pmc bot, fall back to defaults
     * @param isPmc is the bot we want limits for a pmc
     * @param botRole what role does the bot have
     * @returns dictionary of tplIds and limit
     */
    static getItemSpawnLimitsForBotType(isPmc, botRole)
    {
        if (isPmc)
        {
            return BotConfig.itemSpawnLimits["pmc"];
        }

        if (BotConfig.itemSpawnLimits[botRole.toLowerCase()])
        {
            return BotConfig.itemSpawnLimits[botRole.toLowerCase()];
        }

        Logger.warning(
            `Unable to find spawn limits for ${botRole}, falling back to defaults`
        );
        return BotConfig.itemSpawnLimits["default"];
    }

    /**
     * Get the parentId or tplId of item inside spawnLimits object if it exists
     * @param itemTemplate item we want to look for in spawn limits
     * @param spawnLimits Limits to check for item
     * @returns id as string, otherwise undefined
     */
    static getMatchingIdFromSpawnLimits(itemTemplate, spawnLimits)
    {
        if (itemTemplate._id in spawnLimits)
        {
            return itemTemplate._id;
        }

        // tplId not found in spawnLimits, check if parentId is
        if (itemTemplate._parent in spawnLimits)
        {
            return itemTemplate._parent;
        }

        // parentId and tplid not found
        return undefined;
    }
}

module.exports = BotLootGenerator;

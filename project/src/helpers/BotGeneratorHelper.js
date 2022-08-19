"use strict";

require("../Lib.js");

class ExhaustableArray
{
    pool;

    constructor(itemPool)
    {
        this.pool = JsonUtil.clone(itemPool);
    }

    getRandomValue()
    {
        if (!this.pool || !this.pool.length)
        {
            return null;
        }

        const index = RandomUtil.getInt(0, this.pool.length - 1);
        const toReturn = JsonUtil.clone(this.pool[index]);
        this.pool.splice(index, 1);
        return toReturn;
    }

    getFirstValue()
    {
        if (!this.pool || !this.pool.length)
        {
            return null;
        }

        const toReturn = JsonUtil.clone(this.pool[0]);
        this.pool.splice(0, 1);
        return toReturn;
    }

    hasValues()
    {
        if (this.pool && this.pool.length)
        {
            return true;
        }

        return false;
    }
}

class BotGeneratorHelper
{
    static generateModsForItem(
        items,
        modPool,
        parentId,
        parentTemplate,
        modSpawnChances
    )
    {
        const itemModPool = modPool[parentTemplate._id];

        if (
            !parentTemplate._props.Slots.length &&
            !parentTemplate._props.Cartridges.length &&
            !parentTemplate._props.Chambers.length
        )
        {
            Logger.error(
                `Item ${parentTemplate._id} had mods defined, but no slots to support them`
            );
            return items;
        }

        for (const modSlot in itemModPool)
        {
            const itemSlot = BotGeneratorHelper.getModItemSlot(
                modSlot,
                parentTemplate
            );
            if (!itemSlot)
            {
                Logger.error(
                    `Slot '${modSlot}' does not exist for item ${parentTemplate._id} ${parentTemplate._name}`
                );
                continue;
            }

            if (
                !BotGeneratorHelper.shouldModBeSpawned(
                    itemSlot,
                    modSlot,
                    modSpawnChances
                )
            )
            {
                continue;
            }

            const exhaustableModPool = new ExhaustableArray(
                itemModPool[modSlot],
                RandomUtil,
                JsonUtil
            );

            let modTpl;
            let found = false;
            while (exhaustableModPool.hasValues())
            {
                modTpl = exhaustableModPool.getRandomValue();
                if (
                    !BotGeneratorHelper.isItemIncompatibleWithCurrentItems(
                        items,
                        modTpl,
                        modSlot
                    )
                )
                {
                    found = true;
                    break;
                }
            }

            // Find a mod to attach from items db for required slots if none found above
            const parentSlot = parentTemplate._props.Slots.find(
                i => i._name === modSlot
            );
            if (!found && parentSlot !== undefined && parentSlot._required)
            {
                modTpl = BotGeneratorHelper.getModTplFromItemDb(
                    modTpl,
                    parentSlot,
                    modSlot,
                    items
                );
                found = !!modTpl;
            }

            if (!found || !modTpl)
            {
                if (itemSlot._required)
                {
                    Logger.error(
                        `Could not locate any compatible items to fill '${modSlot}' for ${parentTemplate._id}`
                    );
                }
                continue;
            }

            if (!itemSlot._props.filters[0].Filter.includes(modTpl))
            {
                Logger.error(
                    `Mod ${modTpl} is not compatible with slot '${modSlot}' for item ${parentTemplate._id}`
                );
                continue;
            }

            const modTemplate =
                DatabaseServer.getTables().templates.items[modTpl];
            if (!modTemplate)
            {
                Logger.error(
                    `Could not find mod item template with tpl ${modTpl}`
                );
                Logger.info(
                    `Item -> ${parentTemplate._id}; Slot -> ${modSlot}`
                );
                continue;
            }

            const parentItem =
                DatabaseServer.getTables().templates.items[modTemplate._parent];

            const modId = HashUtil.generate();
            items.push({
                _id: modId,
                _tpl: modTpl,
                parentId: parentId,
                slotId: modSlot,
                ...BotGeneratorHelper.generateExtraPropertiesForItem(modTemplate),
            });

            // I first thought we could use the recursive generateModsForItems as previously for cylinder magazines.
            // However, the recurse doesnt go over the slots of the parent mod but over the modPool which is given by the bot config
            // where we decided to keep cartridges instead of camoras. And since a CylinderMagazine only has one cartridge entry and
            // this entry is not to be filled, we need a special handling for the CylinderMagazine
            if (BotGeneratorHelper.magazineIsCylinderRelated(parentItem._name))
            {
                // we don't have child mods, we need to create the camoras for the magazines instead
                BotGeneratorHelper.fillCamora(items, modPool, modId, modTemplate);
            }
            else
            {
                if (Object.keys(modPool).includes(modTpl))
                {
                    BotGeneratorHelper.generateModsForItem(
                        items,
                        modPool,
                        modId,
                        modTemplate,
                        modSpawnChances
                    );
                }
            }
        }

        return items;
    }

    /**
     * Is this magazine cylinder related (revolvers and grenade launchers)
     * @param magazineParentName the name of the magazines parent
     * @returns true if it is cylinder related
     */
    static magazineIsCylinderRelated(magazineParentName)
    {
        return ["CylinderMagazine", "SpringDrivenCylinder"].includes(
            magazineParentName
        );
    }

    /**
     * randomly choose if a mod should be spawned, 100% for required mods OR mod is ammo slot
     * never return true for an item that has 0% spawn chance
     * @param itemSlot slot the item sits in
     * @param modSlot slot the mod sits in
     * @param modSpawnChances Chances for various mod spawns
     * @returns boolean true if it should spawn
     */
    static shouldModBeSpawned(itemSlot, modSlot, modSpawnChances)
    {
        const modSpawnChance =
            itemSlot._required ||
            BotGeneratorHelper.getAmmoContainers().includes(modSlot)
                ? 100
                : modSpawnChances[modSlot];

        return ProbabilityHelper.rollChance(modSpawnChance);
    }

    /**
     * Get a list of containers that hold ammo
     * e.g. mod_magazine
     * @returns string array
     */
    static getAmmoContainers()
    {
        return [
            "mod_magazine",
            "patron_in_weapon",
            "patron_in_weapon_000",
            "patron_in_weapon_001",
            "cartridges",
        ];
    }

    /**
     * Get the slot details for an item (chamber/cartridge/slot)
     * @param modSlot e.g patron_in_weapon
     * @param parentTemplate item template
     * @returns
     */
    static getModItemSlot(modSlot, parentTemplate)
    {
        switch (modSlot)
        {
            case "patron_in_weapon":
            case "patron_in_weapon_000":
            case "patron_in_weapon_001":
                return parentTemplate._props.Chambers.find(c =>
                    c._name.includes(modSlot)
                );
            case "cartridges":
                return parentTemplate._props.Cartridges.find(
                    c => c._name === modSlot
                );
            default:
                return parentTemplate._props.Slots.find(
                    s => s._name === modSlot
                );
        }
    }

    /**
     * With the shotgun revolver (60db29ce99594040e04c4a27) 12.12 introduced CylinderMagazines.
     * Those magazines (e.g. 60dc519adf4c47305f6d410d) have a "Cartridges" entry with a _max_count=0.
     * Ammo is not put into the magazine directly but assigned to the magazine's slots: The "camora_xxx" slots.
     * This function is a helper called by generateModsForItem for mods with parent type "CylinderMagazine"
     *
     * @param {object}      items               The items where the CylinderMagazine's camora are appended to
     * @param {object}      modPool             modPool which should include available cartrigdes
     * @param {string}      parentId            The CylinderMagazine's UID
     * @param {object}      parentTemplate      The CylinderMagazine's template
     */
    static fillCamora(items, modPool, parentId, parentTemplate)
    {
        const itemModPool = modPool[parentTemplate._id];

        let exhaustableModPool;
        let modSlot = "cartridges";
        const camoraFirstSlot = "camora_000";
        if (modSlot in itemModPool)
        {
            exhaustableModPool = new ExhaustableArray(
                itemModPool[modSlot],
                RandomUtil,
                JsonUtil
            );
        }
        else if (camoraFirstSlot in itemModPool)
        {
            modSlot = camoraFirstSlot;
            exhaustableModPool = new ExhaustableArray(
                BotGeneratorHelper.mergeCamoraPoolsTogether(itemModPool),
                RandomUtil,
                JsonUtil
            );
        }
        else
        {
            Logger.error(
                `itemPool does not contain cartridges for a CylinderMagazine ${parentTemplate._id}. Filling of camoras cancelled.`
            );
            return;
        }

        let modTpl;
        let found = false;
        while (exhaustableModPool.hasValues())
        {
            modTpl = exhaustableModPool.getRandomValue();
            if (
                !BotGeneratorHelper.isItemIncompatibleWithCurrentItems(
                    items,
                    modTpl,
                    modSlot
                )
            )
            {
                found = true;
                break;
            }
        }

        if (!found)
        {
            Logger.error(
                `No compatible ammo found for ${modSlot}. Filling of camoras cancelled.`
            );
            return;
        }

        for (const slot of parentTemplate._props.Slots)
        {
            const modSlotId = slot._name;
            const modId = HashUtil.generate();
            items.push({
                _id: modId,
                _tpl: modTpl,
                parentId: parentId,
                slotId: modSlotId,
            });
        }
    }

    /**
     * Take a record of camoras and merge the compatable shells into one array
     * @param camorasWithShells camoras we want to merge into one array
     * @returns string array of shells fro luitple camora sources
     */
    static mergeCamoraPoolsTogether(camorasWithShells)
    {
        const poolResult = [];
        for (const camoraKey in camorasWithShells)
        {
            const shells = camorasWithShells[camoraKey];
            for (const shell of shells)
            {
                // Only add distinct shells
                if (!poolResult.includes(shell))
                {
                    poolResult.push(shell);
                }
            }
        }

        return poolResult;
    }

    static generateExtraPropertiesForItem(itemTemplate, botRole = undefined)
    {
        const properties = {};

        if (itemTemplate._props.MaxDurability)
        {
            if (itemTemplate._props.weapClass)
            {
                // Is weapon
                properties.Repairable =
                    BotGeneratorHelper.generateWeaponRepairableProperties(
                        itemTemplate,
                        botRole
                    );
            }
            else if (itemTemplate._props.armorClass)
            {
                // Is armor
                properties.Repairable =
                    BotGeneratorHelper.generateArmorRepairableProperties(
                        itemTemplate,
                        botRole
                    );
            }
        }

        if (itemTemplate._props.HasHinge)
        {
            properties.Togglable = { On: true };
        }

        if (itemTemplate._props.Foldable)
        {
            properties.Foldable = { Folded: false };
        }

        if (
            itemTemplate._props.weapFireType &&
            itemTemplate._props.weapFireType.length
        )
        {
            properties.FireMode = {
                FireMode: RandomUtil.getArrayValue(
                    itemTemplate._props.weapFireType
                ),
            };
        }

        if (itemTemplate._props.MaxHpResource)
        {
            properties.MedKit = {
                HpResource: itemTemplate._props.MaxHpResource,
            };
        }

        if (
            itemTemplate._props.MaxResource &&
            itemTemplate._props.foodUseTime
        )
        {
            properties.FoodDrink = {
                HpPercent: itemTemplate._props.MaxResource,
            };
        }

        return Object.keys(properties).length ? { upd: properties } : {};
    }

    /**
     * Create a repairable object for a weapon that containers durability + max durability properties
     * @param itemTemplate weapon object being generated for
     * @param botRole type of bot being generated for
     * @returns Repairable object
     */
    static generateWeaponRepairableProperties(itemTemplate, botRole)
    {
        const maxDurability =
            DurabilityLimitsHelper.getRandomisedMaxWeaponDurability(
                itemTemplate,
                botRole
            );
        const currentDurability =
            DurabilityLimitsHelper.getRandomisedWeaponDurability(
                itemTemplate,
                botRole,
                maxDurability
            );

        return {
            Durability: currentDurability,
            MaxDurability: maxDurability,
        };
    }

    /**
     * Create a repairable object for an armor that containers durability + max durability properties
     * @param itemTemplate weapon object being generated for
     * @param botRole type of bot being generated for
     * @returns Repairable object
     */
    static generateArmorRepairableProperties(itemTemplate, botRole)
    {
        let maxDurability;
        let currentDurability;
        if (itemTemplate._props.armorClass === 0)
        {
            maxDurability = itemTemplate._props.MaxDurability;
            currentDurability = itemTemplate._props.MaxDurability;
        }
        else
        {
            maxDurability =
                DurabilityLimitsHelper.getRandomisedMaxArmorDurability(
                    itemTemplate,
                    botRole
                );
            currentDurability =
                DurabilityLimitsHelper.getRandomisedArmorDurability(
                    itemTemplate,
                    botRole,
                    maxDurability
                );
        }

        return {
            Durability: currentDurability,
            MaxDurability: maxDurability,
        };
    }

    static getModTplFromItemDb(modTpl, parentSlot, modSlot, items)
    {
        // Find combatible mods and make an array of them
        const unsortedModArray = parentSlot._props.filters[0].Filter;
        const sortedModArray = BotGeneratorHelper.sortModArray(unsortedModArray);

        // Find mod item that fits slot from sorted mod array
        const exhaustableModPool = new ExhaustableArray(
            sortedModArray,
            RandomUtil,
            JsonUtil
        );
        let tmpModTpl = modTpl;
        while (exhaustableModPool.hasValues())
        {
            tmpModTpl = exhaustableModPool.getFirstValue();
            if (
                !BotGeneratorHelper.isItemIncompatibleWithCurrentItems(
                    items,
                    tmpModTpl,
                    modSlot
                )
            )
            {
                return tmpModTpl;
            }
        }

        return null;
    }

    /**
     * Sort by spawn chance, highest to lowest, higher is more common
     * @param unsortedModArray String array to sort
     * @returns Sorted string array
     */
    static sortModArray(unsortedModArray)
    {
        return unsortedModArray.sort((a, b) =>
        {
            a =
                DatabaseServer.getTables().templates.items[
                    a
                ]._props.SpawnChance.toString();
            b =
                DatabaseServer.getTables().templates.items[
                    b
                ]._props.SpawnChance.toString();

            return parseInt(a) - parseInt(b);
        });
    }

    /**
     * Can an item be added to an item without issue
     * @param items
     * @param tplToCheck
     * @param equipmentSlot
     * @returns true if possible
     */
    static isItemIncompatibleWithCurrentItems(
        items,
        tplToCheck,
        equipmentSlot
    )
    {
        // TODO: Can probably be optimized to cache itemTemplates as items are added to inventory
        const itemTemplates = items.map(
            i => DatabaseServer.getTables().templates.items[i._tpl]
        );
        const templateToCheck =
            DatabaseServer.getTables().templates.items[tplToCheck];

        // Check if any of the current inventory templates have the incoming item defined as incompatible
        const currentInventoryCheck = itemTemplates.some(
            item =>
                item._props[`Blocks${equipmentSlot}`] ||
                item._props.ConflictingItems.includes(tplToCheck)
        );

        // Check if the incoming item has any inventory items defined as incompatible
        const itemCheck = items.some(
            item =>
                templateToCheck._props[`Blocks${item.slotId}`] ||
                templateToCheck._props.ConflictingItems.includes(item._tpl)
        );

        return currentInventoryCheck || itemCheck;
    }

    /**
     * Adds an item with all its childern into specified equipmentSlots, wherever it fits.
     * @param equipmentSlots
     * @param parentId
     * @param parentTpl
     * @param itemWithChildren
     * @param inventory
     * @returns a `boolean` indicating item was added
     */
    static addItemWithChildrenToEquipmentSlot(
        equipmentSlots,
        parentId,
        parentTpl,
        itemWithChildren,
        inventory
    )
    {
        for (const slot of equipmentSlots)
        {
            const container = inventory.items.find(i => i.slotId === slot);

            if (!container)
            {
                continue;
            }

            const containerTemplate =
                DatabaseServer.getTables().templates.items[container._tpl];

            if (!containerTemplate)
            {
                Logger.error(
                    `Could not find container template with tpl ${container._tpl}`
                );
                continue;
            }

            if (
                !containerTemplate._props.Grids ||
                !containerTemplate._props.Grids.length
            )
            {
                // Container has no slots to hold items
                continue;
            }

            const itemSize = InventoryHelper.getItemSize(
                parentTpl,
                parentId,
                itemWithChildren
            );

            for (const slotGrid of containerTemplate._props.Grids)
            {
                if (
                    slotGrid._props.cellsH === 0 ||
                    slotGrid._props.cellsV === 0
                )
                {
                    continue;
                }

                if (
                    !BotGeneratorHelper.itemAllowedInContainer(
                        slotGrid,
                        parentTpl
                    )
                )
                {
                    continue;
                }

                const containerItems = inventory.items.filter(
                    i =>
                        i.parentId === container._id &&
                        i.slotId === slotGrid._name
                );
                const slotMap = InventoryHelper.getContainerMap(
                    slotGrid._props.cellsH,
                    slotGrid._props.cellsV,
                    containerItems,
                    container._id
                );
                const findSlotResult = ContainerHelper.findSlotForItem(
                    slotMap,
                    itemSize[0],
                    itemSize[1]
                );

                if (findSlotResult.success)
                {
                    const parentItem = itemWithChildren.find(
                        i => i._id === parentId
                    );

                    parentItem.parentId = container._id;
                    parentItem.slotId = slotGrid._name;
                    parentItem.location = {
                        x: findSlotResult.x,
                        y: findSlotResult.y,
                        r: findSlotResult.rotation ? 1 : 0,
                    };

                    inventory.items.push(...itemWithChildren);
                    return true;
                }
            }
        }

        return false;
    }

    static itemAllowedInContainer(slot, itemTpl)
    {
        const filters = slot._props.filters;

        // Check if item base type is excluded
        if (
            filters &&
            filters.length &&
            (filters[0].ExcludedFilter || filters[0].Filter)
        )
        {
            const itemDetails = ItemHelper.getItem(itemTpl)[1];

            // if item to add is found in exclude filter, not allowed
            if (filters[0].ExcludedFilter.includes(itemDetails._parent))
            {
                return false;
            }

            // if Filter array only contains 1 filter and its for 'item', allowed
            if (
                filters[0].Filter.length === 1 &&
                filters[0].Filter.includes(BaseClasses.ITEM)
            )
            {
                return true;
            }

            // if allowed filter has something in it + filter doesnt have item, not allowed
            if (
                filters[0].Filter.length > 0 &&
                !filters[0].Filter.includes(itemDetails._parent)
            )
            {
                return false;
            }
        }

        return true;
    }
}

module.exports = BotGeneratorHelper;

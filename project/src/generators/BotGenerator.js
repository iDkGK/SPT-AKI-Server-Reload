"use strict";

require("../Lib.js");

const EquipmentSlots = {
    Headwear: "Headwear",
    Earpiece: "Earpiece",
    FaceCover: "FaceCover",
    ArmorVest: "ArmorVest",
    Eyewear: "Eyewear",
    ArmBand: "ArmBand",
    TacticalVest: "TacticalVest",
    Pockets: "Pockets",
    Backpack: "Backpack",
    SecuredContainer: "SecuredContainer",
    FirstPrimaryWeapon: "FirstPrimaryWeapon",
    SecondPrimaryWeapon: "SecondPrimaryWeapon",
    Holster: "Holster",
    Scabbard: "Scabbard"
};

class BotGenerator
{
    static inventory = {};

    static generateInventory(templateInventory, equipmentChances, generation, botRole, isPmc)
    {
        // Generate base inventory with no items
        BotGenerator.inventory = BotGenerator.generateInventoryBase();

        // Go over all defined equipment slots and generate an item for each of them
        const excludedSlots = [
            EquipmentSlots.FirstPrimaryWeapon,
            EquipmentSlots.SecondPrimaryWeapon,
            EquipmentSlots.Holster,
            EquipmentSlots.ArmorVest
        ];

        for (const equipmentSlot in templateInventory.equipment)
        {
            // Weapons have special generation and will be generated seperately; ArmorVest should be generated after TactivalVest
            if (excludedSlots.includes(equipmentSlot))
            {
                continue;
            }
            BotGenerator.generateEquipment(equipmentSlot, templateInventory.equipment[equipmentSlot], templateInventory.mods, equipmentChances, botRole);
        }

        // ArmorVest is generated afterwards to ensure that TacticalVest is always first, in case it is incompatible
        BotGenerator.generateEquipment(EquipmentSlots.ArmorVest, templateInventory.equipment.ArmorVest, templateInventory.mods, equipmentChances, botRole);

        // Roll weapon spawns and generate a weapon for each roll that passed
        const shouldSpawnPrimary = RandomUtil.getIntEx(100) <= equipmentChances.equipment.FirstPrimaryWeapon;
        const weaponSlotSpawns = [
            {
                slot: EquipmentSlots.FirstPrimaryWeapon,
                shouldSpawn: shouldSpawnPrimary
            },
            { // Only roll for a chance at secondary if primary roll was successful
                slot: EquipmentSlots.SecondPrimaryWeapon,
                shouldSpawn: shouldSpawnPrimary ? RandomUtil.getIntEx(100) <= equipmentChances.equipment.SecondPrimaryWeapon : false
            },
            { // Roll for an extra pistol, unless primary roll failed - in that case, pistol is guaranteed
                slot: EquipmentSlots.Holster,
                shouldSpawn: shouldSpawnPrimary ? RandomUtil.getIntEx(100) <= equipmentChances.equipment.Holster : true
            }
        ];

        for (const weaponSlot of weaponSlotSpawns)
        {
            if (weaponSlot.shouldSpawn && Object.keys(templateInventory.equipment[weaponSlot.slot]).length)
            {
                BotGenerator.generateWeapon(
                    weaponSlot.slot,
                    templateInventory.equipment[weaponSlot.slot],
                    templateInventory.mods,
                    equipmentChances.mods,
                    generation.items.magazines,
                    botRole,
                    isPmc);
            }
        }

        BotGenerator.generateLoot(templateInventory.items, generation.items, isPmc);

        return JsonUtil.clone(BotGenerator.inventory);
    }

    static generateInventoryBase()
    {
        const equipmentId = HashUtil.generate();
        const equipmentTpl = "55d7217a4bdc2d86028b456d";

        const stashId = HashUtil.generate();
        const stashTpl = "566abbc34bdc2d92178b4576";

        const questRaidItemsId = HashUtil.generate();
        const questRaidItemsTpl = "5963866286f7747bf429b572";

        const questStashItemsId = HashUtil.generate();
        const questStashItemsTpl = "5963866b86f7747bfa1c4462";

        const sortingTableId = HashUtil.generate();
        const sortingTableTpl = "602543c13fee350cd564d032";

        return {
            "items": [
                {
                    "_id": equipmentId,
                    "_tpl": equipmentTpl
                },
                {
                    "_id": stashId,
                    "_tpl": stashTpl
                },
                {
                    "_id": questRaidItemsId,
                    "_tpl": questRaidItemsTpl
                },
                {
                    "_id": questStashItemsId,
                    "_tpl": questStashItemsTpl
                },
                {
                    "_id": sortingTableId,
                    "_tpl": sortingTableTpl
                }
            ],
            "equipment": equipmentId,
            "stash": stashId,
            "questRaidItems": questRaidItemsId,
            "questStashItems": questStashItemsId,
            "sortingTable": sortingTableId,
            "fastPanel": {}
        };
    }

    static generateEquipment(equipmentSlot, equipmentPool, modPool, spawnChances, botRole)
    {
        const spawnChance = [EquipmentSlots.Pockets, EquipmentSlots.SecuredContainer].includes(equipmentSlot)
            ? 100
            : spawnChances.equipment[equipmentSlot];
        if (typeof spawnChance === "undefined")
        {
            Logger.warning(`No spawn chance was defined for ${equipmentSlot}`);
            return;
        }

        const shouldSpawn = RandomUtil.getIntEx(100) <= spawnChance;
        if (Object.keys(equipmentPool).length && shouldSpawn)
        {
            const id = HashUtil.generate();
            const equipmentItemTpl = WeightedRandomHelper.getWeightedInventoryItem(equipmentPool);
            const itemTemplate = DatabaseServer.tables.templates.items[equipmentItemTpl];

            if (!itemTemplate)
            {
                Logger.error(`Could not find item template with tpl ${equipmentItemTpl}`);
                Logger.info(`EquipmentSlot -> ${equipmentSlot}`);
                return;
            }

            if (BotGenerator.isItemIncompatibleWithCurrentItems(BotGenerator.inventory.items, equipmentItemTpl, equipmentSlot))
            {
                // Bad luck - randomly picked item was not compatible with current gear
                return;
            }

            const item = {
                "_id": id,
                "_tpl": equipmentItemTpl,
                "parentId": BotGenerator.inventory.equipment,
                "slotId": equipmentSlot,
                ...BotGenerator.generateExtraPropertiesForItem(itemTemplate, botRole)
            };

            if (Object.keys(modPool).includes(equipmentItemTpl))
            {
                const items = BotGenerator.generateModsForItem([item], modPool, id, itemTemplate, spawnChances.mods);
                BotGenerator.inventory.items.push(...items);
            }
            else
            {
                BotGenerator.inventory.items.push(item);
            }
        }
    }

    static generateWeapon(equipmentSlot, weaponPool, modPool, modChances, magCounts, botRole, isPmc)
    {
        const id = HashUtil.generate();
        //const weaponTpl = RandomUtil.getArrayValue(weaponPool);
        const weaponTpl = WeightedRandomHelper.getWeightedInventoryItem(weaponPool);
        const itemTemplate = DatabaseServer.tables.templates.items[weaponTpl];

        if (!itemTemplate)
        {
            Logger.error(`Could not find item template with tpl ${weaponTpl}`);
            Logger.error(`WeaponSlot -> ${equipmentSlot}`);
            return;
        }

        let weaponMods = [{
            "_id": id,
            "_tpl": weaponTpl,
            "parentId": BotGenerator.inventory.equipment,
            "slotId": equipmentSlot,
            ...BotGenerator.generateExtraPropertiesForItem(itemTemplate, botRole)
        }];

        if (Object.keys(modPool).includes(weaponTpl))
        {
            weaponMods = BotGenerator.generateModsForItem(weaponMods, modPool, id, itemTemplate, modChances, isPmc);
        }

        if (!BotGenerator.isWeaponValid(weaponMods))
        {
            // Invalid weapon generated, fallback to preset
            Logger.warning(`Weapon ${weaponTpl} was generated incorrectly, see error above`);
            weaponMods = [];

            // TODO: Right now, preset weapons trigger a lot of warnings regarding missing ammo in magazines & such
            let preset;
            for (const [presetId, presetObj] of Object.entries(DatabaseServer.tables.globals.ItemPresets))
            {
                if (presetObj._items[0]._tpl === weaponTpl)
                {
                    preset = presetObj;
                    break;
                }
            }

            if (preset)
            {
                const parentItem = preset._items[0];
                preset._items[0] = {
                    ...parentItem, ...{
                        "parentId": BotGenerator.inventory.equipment,
                        "slotId": equipmentSlot,
                        ...BotGenerator.generateExtraPropertiesForItem(itemTemplate, botRole)
                    }
                };
                weaponMods.push(...preset._items);
            }
            else
            {
                Logger.error(`Could not find preset for weapon with tpl ${weaponTpl}`);
                return;
            }
        }

        // Find ammo to use when filling magazines
        const ammoTpl = BotGenerator.getCompatibleAmmo(weaponMods, itemTemplate);

        // Fill existing magazines to full and sync ammo type
        for (const mod of weaponMods.filter(mod => mod.slotId === "mod_magazine"))
        {
            BotGenerator.fillExistingMagazines(weaponMods, mod, ammoTpl);
        }

        BotGenerator.inventory.items.push(...weaponMods);

        // Generate extra magazines and attempt add them to TacticalVest or Pockets
        BotGenerator.generateExtraMagazines(weaponMods, itemTemplate, magCounts, ammoTpl);
    }

    static generateModsForItem(items, modPool, parentId, parentTemplate, modSpawnChances, isPmc = false)
    {
        const itemModPool = modPool[parentTemplate._id];

        if (!parentTemplate._props.Slots.length
            && !parentTemplate._props.Cartridges.length
            && !parentTemplate._props.Chambers.length)
        {
            Logger.error(`Item ${parentTemplate._id} had mods defined, but no slots to support them`);
            return items;
        }

        for (const modSlot in itemModPool)
        {
            let itemSlot;
            switch (modSlot)
            {
                case "patron_in_weapon":
                case "patron_in_weapon_000":
                case "patron_in_weapon_001":
                    itemSlot = parentTemplate._props.Chambers.find(c => c._name.includes(modSlot));
                    break;
                case "cartridges":
                    itemSlot = parentTemplate._props.Cartridges.find(c => c._name === modSlot);
                    break;
                default:
                    itemSlot = parentTemplate._props.Slots.find(s => s._name === modSlot);
                    break;
            }

            if (!itemSlot)
            {
                Logger.error(`Slot '${modSlot}' does not exist for item ${parentTemplate._id}`);
                continue;
            }

            const ammoContainers = ["mod_magazine", "patron_in_weapon", "patron_in_weapon_000", "patron_in_weapon_001", "cartridges"];
            const modSpawnChance = itemSlot._required || ammoContainers.includes(modSlot)
                ? 100
                : modSpawnChances[modSlot];
            if (RandomUtil.getIntEx(100) > modSpawnChance)
            {
                continue;
            }

            // Filter blacklisted cartridges
            if (isPmc && ammoContainers.includes(modSlot))
            {
                // Array includes mod_magazine which isnt a cartridge, but we need to filter the other 4 items
                const cartridgeBlacklist = BotConfig.pmc.cartridgeBlacklist;
                itemModPool[modSlot] = itemModPool[modSlot].filter(x => !cartridgeBlacklist.includes(x));
            }

            const exhaustableModPool = new ExhaustableArray(itemModPool[modSlot]);

            let modTpl;
            let found = false;
            while (exhaustableModPool.hasValues())
            {
                modTpl = exhaustableModPool.getRandomValue();
                if (!BotGenerator.isItemIncompatibleWithCurrentItems(items, modTpl, modSlot))
                {
                    found = true;
                    break;
                }
            }

            // Find a mod to attach from items db for required slots if none found above
            const parentSlot = parentTemplate._props.Slots.find(i => i._name === modSlot);
            if (!found && parentSlot !== undefined && parentSlot._required)
            {
                modTpl = BotGenerator.getModTplFromItemDb(modTpl, parentSlot, modSlot, items);
                found = !!modTpl;
            }

            if (!found || !modTpl)
            {
                if (itemSlot._required)
                {
                    Logger.error(`Could not locate any compatible items to fill '${modSlot}' for ${parentTemplate._id}`);
                }
                continue;
            }

            if (!itemSlot._props.filters[0].Filter.includes(modTpl))
            {
                Logger.error(`Mod ${modTpl} is not compatible with slot '${modSlot}' for item ${parentTemplate._id}`);
                continue;
            }

            const modTemplate = DatabaseServer.tables.templates.items[modTpl];
            if (!modTemplate)
            {
                Logger.error(`Could not find mod item template with tpl ${modTpl}`);
                Logger.info(`Item -> ${parentTemplate._id}; Slot -> ${modSlot}`);
                continue;
            }

            // TODO: check if weapon already has sight
            // 'sight' 550aa4154bdc2dd8348b456b 2x parents down
            const parentItem = DatabaseServer.tables.templates.items[modTemplate._parent];
            if (modTemplate._parent === "550aa4154bdc2dd8348b456b" || parentItem._parent === "550aa4154bdc2dd8348b456b")
            {
                // todo, check if another sight is already on gun AND isnt a side-mounted sight
                // if weapon has sight already, skip
            }

            const modId = HashUtil.generate();
            items.push({
                "_id": modId,
                "_tpl": modTpl,
                "parentId": parentId,
                "slotId": modSlot,
                ...BotGenerator.generateExtraPropertiesForItem(modTemplate)
            });

            // I first thought we could use the recursive generateModsForItems as previously for cylinder magazines.
            // However, the recurse doesnt go over the slots of the parent mod but over the modPool which is given by the bot config
            // where we decided to keep cartridges instead of camoras. And since a CylinderMagazine only has one cartridge entry and
            // this entry is not to be filled, we need a special handling for the CylinderMagazine
            if (parentItem._name === "CylinderMagazine")
            {
                // we don't have child mods, we need to create the camoras for the magazines instead
                BotGenerator.fillCamora(items, modPool, modId, modTemplate);
            }
            else
            {
                if (Object.keys(modPool).includes(modTpl))
                {
                    BotGenerator.generateModsForItem(items, modPool, modId, modTemplate, modSpawnChances);
                }
            }
        }

        return items;
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

        let exhaustableModPool = null;
        const modSlot = "cartridges";
        if (modSlot in itemModPool)
        {
            exhaustableModPool = new ExhaustableArray(itemModPool[modSlot]);
        }
        else
        {
            Logger.error(`itemPool does not contain cartridges for a CylinderMagazine ${parentTemplate._id}. Filling of camoras cancelled.`);
            return;
        }

        let modTpl;
        let found = false;
        while (exhaustableModPool.hasValues())
        {
            modTpl = exhaustableModPool.getRandomValue();
            if (!BotGenerator.isItemIncompatibleWithCurrentItems(items, modTpl, modSlot))
            {
                found = true;
                break;
            }
        }

        if (!found)
        {
            Logger.error(`No compatible ammo found for ${modSlot}. Filling of camoras cancelled.`);
            return;
        }

        for (const slot of parentTemplate._props.Slots)
        {
            const modSlot = slot._name;
            const modId = HashUtil.generate();
            items.push({
                "_id": modId,
                "_tpl": modTpl,
                "parentId": parentId,
                "slotId": modSlot
            });
        }
    }

    static getModTplFromItemDb(modTpl, parentSlot, modSlot, items)
    {
        // Find combatible mods and make an array of them
        const unsortedModArray = parentSlot._props.filters[0].Filter;

        // Sort by spawn chance, highest to lowest, higher is more common
        const sortedModArray = unsortedModArray.sort((a, b) =>
        {
            a = DatabaseServer.tables.templates.items[a]._props.SpawnChance;
            b = DatabaseServer.tables.templates.items[b]._props.SpawnChance;

            return a - b;
        });

        // Find mod item that fits slot from sorted mod array
        const exhaustableModPool = new ExhaustableArray(sortedModArray);
        while (exhaustableModPool.hasValues())
        {
            modTpl = exhaustableModPool.getFirstValue();
            if (!BotGenerator.isItemIncompatibleWithCurrentItems(items, modTpl, modSlot))
            {
                return modTpl;
            }
        }
        return null;
    }

    static generateExtraPropertiesForItem(itemTemplate, botRole = null)
    {
        const properties = {};

        if (itemTemplate._props.MaxDurability)
        {
            if (itemTemplate._props.weapClass) // Is weapon
            {
                const maxDurability = DurabilityLimitsHelper.getRandomisedMaxWeaponDurability(itemTemplate, botRole);
                const currentDurability = DurabilityLimitsHelper.getRandomisedWeaponDurability(itemTemplate, botRole, maxDurability);

                properties.Repairable = {
                    "Durability": currentDurability,
                    "MaxDurability": maxDurability
                };
            }
            else if (itemTemplate._props.armorClass) // Is armor
            {
                let maxDurability;
                let currentDurability;
                if (itemTemplate._props.armorClass === "0")
                {
                    maxDurability = itemTemplate._props.MaxDurability;
                    currentDurability = itemTemplate._props.MaxDurability;
                }
                else
                {
                    maxDurability = DurabilityLimitsHelper.getRandomisedMaxArmorDurability(itemTemplate, botRole, maxDurability);
                    currentDurability = DurabilityLimitsHelper.getRandomisedArmorDurability(itemTemplate, botRole, maxDurability);
                }

                properties.Repairable = {
                    "Durability": currentDurability,
                    "MaxDurability": maxDurability
                };
            }
        }

        if (itemTemplate._props.HasHinge)
        {
            properties.Togglable = { "On": true };
        }

        if (itemTemplate._props.Foldable)
        {
            properties.Foldable = { "Folded": false };
        }

        if (itemTemplate._props.weapFireType && itemTemplate._props.weapFireType.length)
        {
            properties.FireMode = { "FireMode": RandomUtil.getArrayValue(itemTemplate._props.weapFireType) };
        }

        if (itemTemplate._props.MaxHpResource)
        {
            properties.MedKit = { "HpResource": itemTemplate._props.MaxHpResource };
        }

        if (itemTemplate._props.MaxResource && itemTemplate._props.foodUseTime)
        {
            properties.FoodDrink = { "HpPercent": itemTemplate._props.MaxResource };
        }

        return Object.keys(properties).length ? { "upd": properties } : {};
    }

    static isItemIncompatibleWithCurrentItems(items, tplToCheck, equipmentSlot)
    {
        // TODO: Can probably be optimized to cache itemTemplates as items are added to inventory
        const itemTemplates = items.map(i => DatabaseServer.tables.templates.items[i._tpl]);
        const templateToCheck = DatabaseServer.tables.templates.items[tplToCheck];

        // Check if any of the current inventory templates have the incoming item defined as incompatible
        const currentInventoryCheck = itemTemplates.some(item => item._props[`Blocks${equipmentSlot}`] || item._props.ConflictingItems.includes(tplToCheck));
        // Check if the incoming item has any inventory items defined as incompatible
        const itemCheck = items.some(item => templateToCheck._props[`Blocks${item.slotId}`] || templateToCheck._props.ConflictingItems.includes(item._tpl));

        return currentInventoryCheck || itemCheck;
    }

    /** Checks if all required slots are occupied on a weapon and all it's mods */
    static isWeaponValid(itemList)
    {
        for (const item of itemList)
        {
            const template = DatabaseServer.tables.templates.items[item._tpl];
            if (!template._props.Slots || !template._props.Slots.length)
            {
                continue;
            }

            for (const slot of template._props.Slots)
            {
                if (!slot._required)
                {
                    continue;
                }

                const slotItem = itemList.find(i => i.parentId === item._id && i.slotId === slot._name);
                if (!slotItem)
                {
                    Logger.error(`Required slot '${slot._name}' on ${template._id} was empty`);
                    return false;
                }
            }
        }

        return true;
    }

    /**
    * Generates extra magazines or bullets (if magazine is internal) and adds them to TacticalVest and Pockets.
    * Additionally, adds extra bullets to SecuredContainer
    *
    * @param {*} weaponMods
    * @param {*} weaponTemplate
    * @param {*} magCounts
    * @param {*} ammoTpl
    * @returns
    */
    static generateExtraMagazines(weaponMods, weaponTemplate, magCounts, ammoTpl)
    {
        let magazineTpl = "";
        const magazine = weaponMods.find(m => m.slotId === "mod_magazine");
        if (!magazine)
        {
            // log error if no magazine AND not a chamber loaded weapon (e.g. shotgun revolver)
            if (!weaponTemplate._props.isChamberLoad)
            {
                Logger.warning(`Generated weapon with tpl ${weaponTemplate._id} had no magazine`);
            }

            magazineTpl = weaponTemplate._props.defMagType;
        }
        else
        {
            magazineTpl = magazine._tpl;
        }

        let magTemplate = DatabaseServer.tables.templates.items[magazineTpl];
        if (!magTemplate)
        {
            Logger.error(`Could not find magazine template with tpl ${magazineTpl}`);
            return;
        }

        const range = magCounts.max - magCounts.min;
        const count = BotGenerator.getBiasedRandomNumber(magCounts.min, magCounts.max, Math.round(range * 0.75), 4);

        if (magTemplate._props.ReloadMagType === "InternalMagazine")
        {
            const parentItem = DatabaseServer.tables.templates.items[magTemplate._parent];
            let chamberCount = 0;
            if (parentItem._name === "CylinderMagazine")
            {
                // if we have a CylinderMagazine we count the number of camoras as the _max_count of the magazine is 0
                chamberCount = magTemplate._props.Slots.length;
            }
            else
            {
                chamberCount = magTemplate._props.Cartridges[0]._max_count;
            }
            /* Get the amount of bullets that would fit in the internal magazine
             * and multiply by how many magazines were supposed to be created */
            const bulletCount = chamberCount * count;

            BotGenerator.addBullets(ammoTpl, bulletCount);
        }
        else if (weaponTemplate._props.ReloadMode === "OnlyBarrel")
        {
            const bulletCount = count;

            BotGenerator.addBullets(ammoTpl, bulletCount);
        }
        else
        {
            for (let i = 0; i < count; i++)
            {
                const magId = HashUtil.generate();
                const magWithAmmo = [
                    {
                        "_id": magId,
                        "_tpl": magazineTpl
                    },
                    {
                        "_id": HashUtil.generate(),
                        "_tpl": ammoTpl,
                        "parentId": magId,
                        "slotId": "cartridges",
                        "upd": { "StackObjectsCount": magTemplate._props.Cartridges[0]._max_count }
                    }
                ];

                const success = BotGenerator.addItemWithChildrenToEquipmentSlot(
                    [EquipmentSlots.TacticalVest, EquipmentSlots.Pockets],
                    magId,
                    magazineTpl,
                    magWithAmmo);

                if (!success && i < magCounts.min)
                {
                    /* We were unable to fit at least the minimum amount of magazines,
                     * so we fallback to default magazine and try again.
                     * Temporary workaround to Killa spawning with no extras if he spawns with a drum mag */

                    if (magazineTpl === weaponTemplate._props.defMagType)
                    {
                        // We were already on default - stop here to prevent infinite looping
                        break;
                    }

                    magazineTpl = weaponTemplate._props.defMagType;
                    magTemplate = DatabaseServer.tables.templates.items[magazineTpl];
                    if (!magTemplate)
                    {
                        Logger.error(`Could not find magazine template with tpl ${magazineTpl}`);
                        break;
                    }

                    if (magTemplate._props.ReloadMagType === "InternalMagazine")
                    {
                        break;
                    }

                    i--;
                }
            }
        }

        const ammoTemplate = DatabaseServer.tables.templates.items[ammoTpl];
        if (!ammoTemplate)
        {
            Logger.error(`Could not find ammo template with tpl ${ammoTpl}`);
            return;
        }

        // Add 4 stacks of bullets to SecuredContainer
        for (let i = 0; i < 15; i++)
        {
            const id = HashUtil.generate();
            BotGenerator.addItemWithChildrenToEquipmentSlot([EquipmentSlots.SecuredContainer], id, ammoTpl, [{
                "_id": id,
                "_tpl": ammoTpl,
                "upd": { "StackObjectsCount": ammoTemplate._props.StackMaxSize }
            }]);
        }
    }

    static addBullets(ammoTpl, bulletCount)
    {
        const ammoItems = ItemHelper.splitStack({
            "_id": HashUtil.generate(),
            "_tpl": ammoTpl,
            "upd": { "StackObjectsCount": bulletCount }
        });

        for (const ammoItem of ammoItems)
        {
            BotGenerator.addItemWithChildrenToEquipmentSlot(
                [EquipmentSlots.TacticalVest, EquipmentSlots.Pockets],
                ammoItem._id,
                ammoItem._tpl,
                [ammoItem]);
        }
    }

    /**
     * Finds and returns tpl of ammo that should be used, while making sure it's compatible
     *
     * @param {*} weaponMods
     * @param {*} weaponTemplate
     * @returns
     */
    static getCompatibleAmmo(weaponMods, weaponTemplate)
    {
        let ammoTpl = "";
        let ammoToUse = weaponMods.find(mod => mod.slotId.startsWith("patron_in_weapon") || mod.slotId.startsWith("camora"));
        if (!ammoToUse)
        {
            // No bullet found in chamber, search for ammo in magazines instead
            ammoToUse = weaponMods.find(mod => mod.slotId === "cartridges");
            if (!ammoToUse)
            {
                // Still could not locate ammo to use? Fallback to weapon default
                Logger.warning(`Could not locate ammo to use for ${weaponTemplate._id}, falling back to default -> ${weaponTemplate._props.defAmmo}`);
                // Immediatelly returns, as default ammo is guaranteed to be compatible
                return weaponTemplate._props.defAmmo;
            }
            else
            {
                ammoTpl = ammoToUse._tpl;
            }
        }
        else
        {
            ammoTpl = ammoToUse._tpl;
        }

        if (weaponTemplate._props.Chambers[0] && !weaponTemplate._props.Chambers[0]._props.filters[0].Filter.includes(ammoToUse._tpl))
        {
            // Incompatible ammo was found, return default (can happen with .366 and 7.62x39 weapons)
            return weaponTemplate._props.defAmmo;
        }

        return ammoTpl;
    }

    /** Fill existing magazines to full, while replacing their contents with specified ammo */
    static fillExistingMagazines(weaponMods, magazine, ammoTpl)
    {
        const modTemplate = DatabaseServer.tables.templates.items[magazine._tpl];
        if (!modTemplate)
        {
            Logger.error(`Could not find magazine template with tpl ${magazine._tpl}`);
            return;
        }

        const parentItem = DatabaseServer.tables.templates.items[modTemplate._parent];
        const stackSize = modTemplate._props.Cartridges[0]._max_count;

        // the revolver shotgun uses a magazine, but the magazine does not have cartidges but revolver chambers ("camora_xxx")
        // if the exchange of the camora ammo in the else scope is not necessary we could also just check for stackSize > 0 here
        // and remove the else
        if (parentItem._name !== "CylinderMagazine")
        {
            const cartridges = weaponMods.find(m => m.parentId === magazine._id && m.slotId === "cartridges");

            if (!cartridges)
            {
                Logger.warning(`Magazine with tpl ${magazine._tpl} had no ammo`);
                weaponMods.push({
                    "_id": HashUtil.generate(),
                    "_tpl": ammoTpl,
                    "parentId": magazine._id,
                    "slotId": "cartridges",
                    "upd": { "StackObjectsCount": stackSize }
                });
            }
            else
            {
                cartridges._tpl = ammoTpl;
                cartridges.upd = { "StackObjectsCount": stackSize };
            }
        }
        else
        {
            // for CylinderMagazine we exchange the ammo in the "camoras".
            // This might not be necessary since we already filled the camoras with a random whitelisted and compatible ammo type,
            // but I'm not sure whether this is also used elsewhere
            const camoras = weaponMods.filter(m => m.parentId === magazine._id && m.slotId.startsWith("camora"));
            for (const camora of camoras)
            {
                camora._tpl = ammoTpl;
            }
        }
    }

    static generateLoot(lootPool, itemCounts, isPmc)
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

            let poolItems = {};
            switch (slot.toLowerCase())
            {
                case "specialloot":
                    poolItems = pool.map(lootTpl => DatabaseServer.tables.templates.clientItems.data[lootTpl]);
                    specialLootTemplates.push(...poolItems.filter(x => !!x));
                    break;
                case "pockets":
                    poolItems = pool.map(lootTpl => DatabaseServer.tables.templates.clientItems.data[lootTpl]);
                    pocketLootTemplates.push(...poolItems.filter(x => !!x));
                    break;
                case "tacticalvest":
                    poolItems = pool.map(lootTpl => DatabaseServer.tables.templates.clientItems.data[lootTpl]);
                    vestLootTemplates.push(...poolItems.filter(x => !!x));
                    break;
                case "securedcontainer":
                    // Don't add these items to loot pool
                    break;
                default:
                    poolItems = pool.map(lootTpl => DatabaseServer.tables.templates.clientItems.data[lootTpl]);
                    backpackLootTemplates.push(...poolItems.filter(x => !!x));
            }

            if (Object.keys(poolItems).length > 0)
            {
                combinedPoolTemplates.push(...poolItems.filter(x => !!x));
            }
        }

        // Sort all items by their worth
        specialLootTemplates.sort((a, b) => BotGenerator.compareByValue(a, b));
        backpackLootTemplates.sort((a, b) => BotGenerator.compareByValue(a, b));
        pocketLootTemplates.sort((a, b) => BotGenerator.compareByValue(a, b));
        vestLootTemplates.sort((a, b) => BotGenerator.compareByValue(a, b));
        combinedPoolTemplates.sort((a, b) => BotGenerator.compareByValue(a, b));

        const specialLootItems = specialLootTemplates.filter(template =>
            !("ammoType" in template._props)
            && !("ReloadMagType" in template._props));

        const healingItems = combinedPoolTemplates.filter(template =>
            "medUseTime" in template._props);

        const grenadeItems = combinedPoolTemplates.filter(template =>
            "ThrowType" in template._props);

        // Get loot items (excluding magazines, bullets, grenades and healing items)
        const backpackLootItems = backpackLootTemplates.filter(template =>
            !("ammoType" in template._props)
            && !("ReloadMagType" in template._props)
            && !("medUseTime" in template._props)
            && !("ThrowType" in template._props));

        // Get single slot items for pocket loot
        const pocketLootItems = pocketLootTemplates.filter(template =>
            !("ammoType" in template._props)
            && !("ReloadMagType" in template._props)
            && !("medUseTime" in template._props)
            && !("ThrowType" in template._props)
            && ("Height" in template._props)
            && ("Width" in template._props));

        // Get vest loot items
        const vestLootItems = vestLootTemplates.filter(template =>
            !("ammoType" in template._props)
            && !("ReloadMagType" in template._props)
            && !("medUseTime" in template._props)
            && !("ThrowType" in template._props));

        const nValue = isPmc ? BotConfig.lootNValue.pmc : BotConfig.lootNValue.scav;
        const looseLootMin = itemCounts.looseLoot.min;
        const looseLootMax = itemCounts.looseLoot.max;

        const lootItemCount = BotGenerator.getRandomisedCount(looseLootMin, looseLootMax, nValue);
        const pocketLootCount = BotGenerator.getRandomisedCount(1, 4, nValue);
        const vestLootCount = BotGenerator.getRandomisedCount(Math.round(looseLootMin / 2), Math.round(looseLootMax / 2), nValue); // Count is half what loose loot min/max is
        const specialLootItemCount = BotGenerator.getRandomisedCount(itemCounts.specialItems.min, itemCounts.specialItems.max, nValue);

        const healingItemCount = BotGenerator.getRandomisedCount(itemCounts.healing.min, itemCounts.healing.max, 3);
        const grenadeCount = BotGenerator.getRandomisedCount(itemCounts.grenades.min, itemCounts.grenades.max, 4);

        // Special items
        BotGenerator.addLootFromPool(specialLootItems, [EquipmentSlots.Pockets, EquipmentSlots.Backpack, EquipmentSlots.TacticalVest], specialLootItemCount);

        // Meds
        BotGenerator.addLootFromPool(healingItems, [EquipmentSlots.TacticalVest, EquipmentSlots.Pockets, EquipmentSlots.Backpack, EquipmentSlots.SecuredContainer], healingItemCount);

        // Grenades
        BotGenerator.addLootFromPool(grenadeItems, [EquipmentSlots.TacticalVest, EquipmentSlots.Pockets], grenadeCount);

        // Backpack
        BotGenerator.addLootFromPool(backpackLootItems, [EquipmentSlots.Backpack], lootItemCount, BotConfig.pmc.maxBackpackLootTotalRub, isPmc);

        // Vest
        BotGenerator.addLootFromPool(vestLootItems, [EquipmentSlots.TacticalVest], vestLootCount, BotConfig.pmc.maxVestLootTotalRub, isPmc);

        // Pockets
        BotGenerator.addLootFromPool(pocketLootItems, [EquipmentSlots.Pockets], pocketLootCount, BotConfig.pmc.maxPocketLootTotalRub, isPmc);
    }

    static getRandomisedCount(min, max, nValue)
    {
        const range = max - min;
        return BotGenerator.getBiasedRandomNumber(min, max, range, nValue);
    }

    static addLootFromPool(pool, equipmentSlots, count, totalValueLimit = 0, useLimits = false)
    {
        if (pool.length)
        {
            let currentTotal = 0;
            const limitCount = {};
            for (let i = 0; i < count; i++)
            {
                const itemIndex = BotGenerator.getBiasedRandomNumber(0, pool.length - 1, pool.length - 1, 3);
                const itemTemplate = pool[itemIndex];
                const id = HashUtil.generate();
                const itemsToAdd = [{
                    "_id": id,
                    "_tpl": itemTemplate._id,
                    ...BotGenerator.generateExtraPropertiesForItem(itemTemplate)
                }];

                if (useLimits && Object.keys(limitCount).length === 0)
                {
                    // Init current count of items we want to limit
                    for (const limit in BotConfig.pmc.dynamicLoot.spawnLimits)
                    {
                        limitCount[limit] = 0;
                    }
                }

                if (useLimits)
                {
                    const existsInSpawnLimitDict = itemTemplate._parent in BotConfig.pmc.dynamicLoot.spawnLimits;
                    if (existsInSpawnLimitDict)
                    {
                        // Increment count of item type
                        limitCount[itemTemplate._parent]++;

                        // Skip adding item if over limit
                        if (limitCount[itemTemplate._parent] > BotConfig.pmc.dynamicLoot.spawnLimits[itemTemplate._parent])
                        {
                            i--;
                            continue;
                        }
                    }
                }

                // Fill ammo box
                if (itemTemplate._props.StackSlots && itemTemplate._props.StackSlots.length)
                {
                    itemsToAdd.push({
                        "_id": HashUtil.generate(),
                        "_tpl": itemTemplate._props.StackSlots[0]._props.filters[0].Filter[0],
                        "parentId": id,
                        "slotId": "cartridges",
                        "upd": { "StackObjectsCount": itemTemplate._props.StackMaxRandom }
                    });
                }

                // make money a stack
                if (itemTemplate._parent === ItemHelper.BASECLASS.Money)
                {
                    // only add if no upd or stack objects exist - preserves existing stack count
                    if (!itemsToAdd[0].upd || !itemsToAdd[0].upd.StackObjectsCount)
                    {
                        itemsToAdd[0].upd = { "StackObjectsCount":  RandomUtil.getInt(1, BotConfig.pmc.dynamicLoot.moneyStackLimits[itemTemplate._id]) };
                    }
                }

                // Make ammo a stack
                if (itemTemplate._parent === ItemHelper.BASECLASS.Ammo)
                {
                    // only add if no upd or stack objects exist - preserves existing stack count
                    if (!itemsToAdd[0].upd || !itemsToAdd[0].upd.StackObjectsCount)
                    {
                        itemsToAdd[0].upd = { "StackObjectsCount":  RandomUtil.getInt(1, itemTemplate._props.StackMaxSize) };
                    }
                }

                BotGenerator.addItemWithChildrenToEquipmentSlot(equipmentSlots, id, itemTemplate._id, itemsToAdd);

                // Stop adding items to bots pool if rolling total is over total limit
                if (totalValueLimit > 0)
                {
                    currentTotal += HandbookController.getTemplatePrice(itemTemplate._id);
                    if (currentTotal > totalValueLimit)
                    {
                        break;
                    }
                }
            }
        }
    }

    /** Adds an item with all its childern into specified equipmentSlots, wherever it fits.
     * Returns a `boolean` indicating success. */
    static addItemWithChildrenToEquipmentSlot(equipmentSlots, parentId, parentTpl, itemWithChildren)
    {
        for (const slot of equipmentSlots)
        {
            const container = BotGenerator.inventory.items.find(i => i.slotId === slot);

            if (!container)
            {
                continue;
            }

            const containerTemplate = DatabaseServer.tables.templates.items[container._tpl];

            if (!containerTemplate)
            {
                Logger.error(`Could not find container template with tpl ${container._tpl}`);
                continue;
            }

            if (!containerTemplate._props.Grids || !containerTemplate._props.Grids.length)
            {
                // Container has no slots to hold items
                continue;
            }

            const itemSize = InventoryHelper.getItemSize(parentTpl, parentId, itemWithChildren);

            for (const slot of containerTemplate._props.Grids)
            {
                if (slot._props.cellsH === 0 || slot._props.cellsV === 0)
                {
                    continue;
                }

                if (!BotGenerator.itemAllowedInContainer(slot, parentTpl))
                {
                    continue;
                }

                const containerItems = BotGenerator.inventory.items.filter(i => i.parentId === container._id && i.slotId === slot._name);
                const slotMap = ContainerHelper.getContainerMap(slot._props.cellsH, slot._props.cellsV, containerItems, container._id);
                const findSlotResult = ContainerHelper.findSlotForItem(slotMap, itemSize[0], itemSize[1]);

                if (findSlotResult.success)
                {
                    const parentItem = itemWithChildren.find(i => i._id === parentId);

                    parentItem.parentId = container._id;
                    parentItem.slotId = slot._name;
                    parentItem.location = {
                        "x": findSlotResult.x,
                        "y": findSlotResult.y,
                        "r": findSlotResult.rotation ? 1 : 0
                    };

                    BotGenerator.inventory.items.push(...itemWithChildren);
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
        if (filters && filters.length && (filters[0].ExcludedFilter || filters[0].Filter))
        {
            const itemDetails = ItemHelper.getItem(itemTpl)[1];

            // if item to add is found in exclude filter, not allowed
            if (filters[0].ExcludedFilter.includes(itemDetails._parent))
            {
                return false;
            }

            // if Filter array only contains 1 filter and its for 'item', allowed
            if (filters[0].Filter.length === 1 && filters[0].Filter.includes(ItemHelper.BASECLASS.Item))
            {
                return true;
            }

            // if allowed filter has something in it + filter doesnt have item, not allowed
            if (filters[0].Filter.length > 0 && !filters[0].Filter.includes(itemDetails._parent))
            {
                return false;
            }
        }

        return true;
    }

    static getBiasedRandomNumber(min, max, shift, n)
    {
        /* To whoever tries to make sense of this, please forgive me - I tried my best at explaining what goes on here.
         * This function generates a random number based on a gaussian distribution with an option to add a bias via shifting.
         *
         * Here's an example graph of how the probabilities can be distributed:
         * https://www.boost.org/doc/libs/1_49_0/libs/math/doc/sf_and_dist/graphs/normal_pdf.png
         * Our parameter 'n' is sort of like σ (sigma) in the example graph.
         *
         * An 'n' of 1 means all values are equally likely. Increasing 'n' causes numbers near the edge to become less likely.
         * By setting 'shift' to whatever 'max' is, we can make values near 'min' very likely, while values near 'max' become extremely unlikely.
         *
         * Here's a place where you can play around with the 'n' and 'shift' values to see how the distribution changes:
         * http://jsfiddle.net/e08cumyx/ */

        if (max < min)
        {
            throw {
                "name": "Invalid arguments",
                "message": `Bounded random number generation max is smaller than min (${max} < ${min})`
            };
        }

        if (n < 1)
        {
            throw {
                "name": "Invalid argument",
                "message": `'n' must be 1 or greater (received ${n})`
            };
        }

        if (min === max)
        {
            return min;
        }

        if (shift > (max - min))
        {
            /* If a rolled number is out of bounds (due to bias being applied), we simply roll it again.
             * As the shifting increases, the chance of rolling a number within bounds decreases.
             * A shift that is equal to the available range only has a 50% chance of rolling correctly, theoretically halving performance.
             * Shifting even further drops the success chance very rapidly - so we want to warn against that */

            Logger.warning("Bias shift for random number generation is greater than the range of available numbers.\nThis can have a very severe performance impact!");
            Logger.info(`min -> ${min}; max -> ${max}; shift -> ${shift}`);
        }

        const gaussianRandom = (n) =>
        {
            let rand = 0;

            for (let i = 0; i < n; i += 1)
            {
                rand += Math.random();
            }

            return (rand / n);
        };

        const boundedGaussian = (start, end, n) =>
        {
            return Math.round(start + gaussianRandom(n) * (end - start + 1));
        };

        const biasedMin = shift >= 0 ? min - shift : min;
        const biasedMax = shift < 0 ? max + shift : max;

        let num;
        do
        {
            num = boundedGaussian(biasedMin, biasedMax, n);
        }
        while (num < min || num > max);

        return num;
    }

    /** Compares two item templates by their price to spawn chance ratio */
    static compareByValue(a, b)
    {
        // If an item has no price or spawn chance, it should be moved to the back when sorting
        if (!a._props.CreditsPrice || !a._props.SpawnChance)
        {
            return 1;
        }

        if (!b._props.CreditsPrice || !b._props.SpawnChance)
        {
            return -1;
        }

        const worthA = a._props.CreditsPrice / a._props.SpawnChance;
        const worthB = b._props.CreditsPrice / b._props.SpawnChance;

        if (worthA < worthB)
        {
            return -1;
        }

        if (worthA > worthB)
        {
            return 1;
        }

        return 0;
    }
}

class ExhaustableArray
{
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

module.exports = BotGenerator;

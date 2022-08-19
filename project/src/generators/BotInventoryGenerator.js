"use strict";

require("../Lib.js");

class BotInventoryGenerator
{
    static generateInventory(
        templateInventory,
        equipmentChances,
        generation,
        botRole,
        isPmc
    )
    {
        // Generate base inventory with no items
        const botInventory = BotInventoryGenerator.generateInventoryBase();

        // Go over all defined equipment slots and generate an item for each of them
        const excludedSlots = [
            EquipmentSlots.FIRST_PRIMARY_WEAPON,
            EquipmentSlots.SECOND_PRIMARY_WEAPON,
            EquipmentSlots.HOLSTER,
            EquipmentSlots.ARMOR_VEST,
        ];

        for (const equipmentSlot in templateInventory.equipment)
        {
            // Weapons have special generation and will be generated seperately; ArmorVest should be generated after TactivalVest
            if (excludedSlots.includes(equipmentSlot))
            {
                continue;
            }
            BotInventoryGenerator.generateEquipment(
                equipmentSlot,
                templateInventory.equipment[equipmentSlot],
                templateInventory.mods,
                equipmentChances,
                botRole,
                botInventory
            );
        }

        // ArmorVest is generated afterwards to ensure that TacticalVest is always first, in case it is incompatible
        BotInventoryGenerator.generateEquipment(
            EquipmentSlots.ARMOR_VEST,
            templateInventory.equipment.ArmorVest,
            templateInventory.mods,
            equipmentChances,
            botRole,
            botInventory
        );

        // Roll weapon spawns and generate a weapon for each roll that passed
        const shouldSpawnPrimary =
            RandomUtil.getIntEx(100) <=
            equipmentChances.equipment.FirstPrimaryWeapon;
        const weaponSlotSpawns = [
            {
                slot: EquipmentSlots.FIRST_PRIMARY_WEAPON,
                shouldSpawn: shouldSpawnPrimary,
            },
            {
                // Only roll for a chance at secondary if primary roll was successful
                slot: EquipmentSlots.SECOND_PRIMARY_WEAPON,
                shouldSpawn: shouldSpawnPrimary
                    ? RandomUtil.getIntEx(100) <=
                      equipmentChances.equipment.SecondPrimaryWeapon
                    : false,
            },
            {
                // Roll for an extra pistol, unless primary roll failed - in that case, pistol is guaranteed
                slot: EquipmentSlots.HOLSTER,
                shouldSpawn: shouldSpawnPrimary
                    ? RandomUtil.getIntEx(100) <=
                      equipmentChances.equipment.Holster
                    : true,
            },
        ];

        for (const weaponSlot of weaponSlotSpawns)
        {
            if (
                weaponSlot.shouldSpawn &&
                Object.keys(templateInventory.equipment[weaponSlot.slot]).length
            )
            {
                const generatedWeapon = BotWeaponGenerator.generateRandomWeapon(
                    weaponSlot.slot,
                    templateInventory,
                    botInventory.equipment,
                    equipmentChances.mods,
                    botRole,
                    isPmc
                );

                botInventory.items.push(...generatedWeapon.weapon);

                BotWeaponGenerator.addExtraMagazinesToInventory(
                    generatedWeapon,
                    generation.items.magazines,
                    botInventory,
                    botRole
                );
            }
        }

        BotLootGenerator.generateLoot(
            templateInventory,
            generation.items,
            isPmc,
            botRole,
            botInventory,
            equipmentChances
        );

        return botInventory;
    }

    static generateEquipment(
        equipmentSlot,
        equipmentPool,
        modPool,
        spawnChances,
        botRole,
        inventory
    )
    {
        const spawnChance = [
            EquipmentSlots.POCKETS,
            EquipmentSlots.SECURED_CONTAINER,
        ].includes(equipmentSlot)
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
            const equipmentItemTpl =
                WeightedRandomHelper.getWeightedInventoryItem(equipmentPool);
            const itemTemplate =
                DatabaseServer.getTables().templates.items[equipmentItemTpl];

            if (!itemTemplate)
            {
                Logger.error(
                    `Could not find item template with tpl ${equipmentItemTpl}`
                );
                Logger.info(`EquipmentSlot -> ${equipmentSlot}`);
                return;
            }

            if (
                BotGeneratorHelper.isItemIncompatibleWithCurrentItems(
                    inventory.items,
                    equipmentItemTpl,
                    equipmentSlot
                )
            )
            {
                // Bad luck - randomly picked item was not compatible with current gear
                return;
            }

            const item = {
                _id: id,
                _tpl: equipmentItemTpl,
                parentId: inventory.equipment,
                slotId: equipmentSlot,
                ...BotGeneratorHelper.generateExtraPropertiesForItem(
                    itemTemplate,
                    botRole
                ),
            };

            if (Object.keys(modPool).includes(equipmentItemTpl))
            {
                const items = BotGeneratorHelper.generateModsForItem(
                    [item],
                    modPool,
                    id,
                    itemTemplate,
                    spawnChances.mods
                );
                inventory.items.push(...items);
            }
            else
            {
                inventory.items.push(item);
            }
        }
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
            items: [
                {
                    _id: equipmentId,
                    _tpl: equipmentTpl,
                },
                {
                    _id: stashId,
                    _tpl: stashTpl,
                },
                {
                    _id: questRaidItemsId,
                    _tpl: questRaidItemsTpl,
                },
                {
                    _id: questStashItemsId,
                    _tpl: questStashItemsTpl,
                },
                {
                    _id: sortingTableId,
                    _tpl: sortingTableTpl,
                },
            ],
            equipment: equipmentId,
            stash: stashId,
            questRaidItems: questRaidItemsId,
            questStashItems: questStashItemsId,
            sortingTable: sortingTableId,
            fastPanel: {},
        };
    }
}

module.exports = BotInventoryGenerator;

"use strict";

require("../Lib.js");

class RepairHelper
{
    static updateItemDurability(
        itemToRepair,
        itemToRepairDetails,
        isArmor,
        amountToRepair,
        useRepairKit = false,
        applyRandomDegradation = true
    )
    {
        const itemMaxDurability = JsonUtil.clone(
            itemToRepair.upd.Repairable.MaxDurability
        );
        const itemCurrentDurability = JsonUtil.clone(
            itemToRepair.upd.Repairable.Durability
        );
        const itemCurrentMaxDurability = JsonUtil.clone(
            itemToRepair.upd.Repairable.MaxDurability
        );

        let newCurrentDurability = itemCurrentDurability + amountToRepair;
        let newCurrentMaxDurability = itemCurrentMaxDurability + amountToRepair;

        // Ensure new max isnt above items max
        if (newCurrentMaxDurability > itemMaxDurability)
        {
            newCurrentMaxDurability = itemMaxDurability;
        }

        // Ensure new current isnt above items max
        if (newCurrentDurability > itemMaxDurability)
        {
            newCurrentDurability = itemMaxDurability;
        }

        // Construct object to return
        itemToRepair.upd.Repairable = {
            Durability: newCurrentDurability,
            MaxDurability: newCurrentMaxDurability,
        };

        // when modders set the repair coeficient to 0 it means that they dont want to loose durability on items
        // the code below generates a random degradation on the weapon durability
        if (applyRandomDegradation)
        {
            const randomisedWearAmount = isArmor
                ? RepairHelper.getRandomisedArmorRepairDegredationValue(
                    itemToRepairDetails._props.ArmorMaterial,
                    useRepairKit,
                    itemCurrentMaxDurability
                )
                : RepairHelper.getRandomisedWeaponRepairDegredationValue(
                    itemToRepairDetails._props,
                    useRepairKit,
                    itemCurrentMaxDurability
                );
            // Apply wear to durability
            itemToRepair.upd.Repairable.MaxDurability -= randomisedWearAmount;

            // Ensure current durability matches our new max
            itemToRepair.upd.Repairable.Durability =
                itemToRepair.upd.Repairable.MaxDurability;
        }

        // Repair mask cracks
        if (
            itemToRepair.upd.FaceShield &&
            itemToRepair.upd.FaceShield.Hits > 0
        )
        {
            itemToRepair.upd.FaceShield.Hits = 0;
        }

        return itemToRepair;
    }

    static getRandomisedArmorRepairDegredationValue(
        armorMaterial,
        isRepairKit,
        armorMax
    )
    {
        const armorMaterialSettings =
            DatabaseServer.getTables().globals.config.ArmorMaterials[
                armorMaterial
            ];

        const minMultiplier = isRepairKit
            ? armorMaterialSettings.MinRepairKitDegradation
            : armorMaterialSettings.MinRepairDegradation;

        const maxMultiplier = isRepairKit
            ? armorMaterialSettings.MaxRepairKitDegradation
            : armorMaterialSettings.MaxRepairDegradation;

        const randomValue = RandomUtil.getFloat(minMultiplier, maxMultiplier);

        return randomValue * armorMax;
    }

    static getRandomisedWeaponRepairDegredationValue(
        itemProps,
        isRepairKit,
        armorMax
    )
    {
        const minRepairDeg = isRepairKit
            ? itemProps.MinRepairKitDegradation
            : itemProps.MinRepairDegradation;
        const maxRepairDeg = isRepairKit
            ? itemProps.MaxRepairKitDegradation
            : itemProps.MaxRepairDegradation;

        const randomValue = RandomUtil.getFloat(minRepairDeg, maxRepairDeg);

        return randomValue * armorMax;
    }

    static isWeaponTemplate(tpl)
    {
        const itemTemplates = DatabaseServer.getTables().templates.items;
        const baseItem = itemTemplates[tpl];
        const baseNode = itemTemplates[baseItem._parent];
        const parentNode = itemTemplates[baseNode._parent];

        return parentNode._id === BaseClasses.WEAPON;
    }
}

module.exports = RepairHelper;

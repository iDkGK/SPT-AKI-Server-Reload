"use strict";

require("../Lib.js");

class RepairController
{
    static traderRepair(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        const coef = TraderHelper.getLoyaltyLevel(
            body.tid,
            pmcData
        ).repair_price_coef;
        const repairRate = coef === 0 ? 1 : coef / 100 + 1;

        // find the item to repair
        for (const repairItem of body.repairItems)
        {
            const repairableItem = RepairController.updateItemDurability(
                repairItem._id,
                repairItem.count,
                pmcData
            );

            // get repair price and pay the money
            const itemRepairCost =
                DatabaseServer.tables.templates.items[repairableItem._tpl]
                    ._props.RepairCost;
            const repairCost = Math.round(
                itemRepairCost *
                    repairItem.count *
                    repairRate *
                    RepairConfig.priceMultiplier
            );
            Logger.debug(
                `item base repair cost: ${itemRepairCost}`,
                false,
                true
            );
            Logger.debug(
                `price multipler: ${RepairConfig.priceMultiplier}`,
                false,
                true
            );
            Logger.debug(`repair cost: ${repairCost}`, false, true);

            const options = {
                scheme_items: [
                    {
                        id: repairItem._id,
                        count: Math.round(repairCost),
                    },
                ],
                tid: body.tid,
                Action: "",
                type: "",
                item_id: "",
                count: 0,
                scheme_id: 0,
            };

            output = PaymentService.payMoney(
                pmcData,
                options,
                sessionID,
                output
            );
            if (output.warnings.length > 0)
            {
                return output;
            }

            output.profileChanges[sessionID].items.change.push(repairableItem);

            // add skill points for repairing weapons
            if (RepairController.isWeaponTemplate(repairableItem._tpl))
            {
                const progress =
                    DatabaseServer.tables.globals.config.SkillsSettings
                        .WeaponTreatment.SkillPointsPerRepair;
                QuestHelper.rewardSkillPoints(
                    sessionID,
                    pmcData,
                    output,
                    "WeaponTreatment",
                    progress
                );
            }
        }

        return output;
    }

    static updateItemDurability(
        itemToRepairId,
        amountToRepair,
        pmcData,
        useRepairKit = false
    )
    {
        const itemToRepair = pmcData.Inventory.items.find(
            x => x._id === itemToRepairId
        );
        if (itemToRepair === undefined)
        {
            return undefined;
        }
        const itemToRepairDetails =
            DatabaseServer.tables.templates.items[itemToRepair._tpl];
        const isArmor = !!itemToRepairDetails._props.ArmorMaterial;
        const itemMaxDurability = JsonUtil.clone(itemToRepair.upd.Repairable.MaxDurability);
        const itemCurrentDurability = JsonUtil.clone(itemToRepair.upd.Repairable.Durability);
        const itemCurrentMaxDurability = JsonUtil.clone(itemToRepair.upd.Repairable.MaxDurability);
        let newCurrentDurability = itemCurrentDurability + amountToRepair;
        let newCurrentMaxDurability = itemCurrentMaxDurability + amountToRepair;
        const randomisedWearAmount = (isArmor)
            ? RepairController.getRandomisedArmorRepairDegredationValue(itemToRepairDetails._props.ArmorMaterial, useRepairKit, itemCurrentMaxDurability)
            : RepairController.getRandomisedWeaponRepairDegredationValue(itemToRepairDetails._props, useRepairKit, itemCurrentMaxDurability);
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
            MaxDurability: newCurrentMaxDurability
        };
        // Apply wear to durability
        itemToRepair.upd.Repairable.MaxDurability -= randomisedWearAmount;

        // Ensure current durability matches our new max
        itemToRepair.upd.Repairable.Durability = itemToRepair.upd.Repairable.MaxDurability;
        // repair mask cracks
        if (
            itemToRepair.upd.FaceShield &&
            itemToRepair.upd.FaceShield.Hits > 0
        )
        {
            itemToRepair.upd.FaceShield.Hits = 0;
        }
        return itemToRepair;
    }

    static getRandomisedArmorRepairDegredationValue(armorMaterial, isRepairKit, armorMax)
    {
        const armorMaterialSettings =
            DatabaseServer.tables.globals.config.ArmorMaterials[armorMaterial];
        const minMultiplier = isRepairKit
            ? armorMaterialSettings.MinRepairKitDegradation
            : armorMaterialSettings.MinRepairDegradation;
        const maxMultiplier = isRepairKit
            ? armorMaterialSettings.MaxRepairKitDegradation
            : armorMaterialSettings.MaxRepairDegradation;
        const randomValue = RandomUtil.getFloat(minMultiplier, maxMultiplier);
        return randomValue * armorMax;
    }

    static getRandomisedWeaponRepairDegredationValue(itemProps, isRepairKit, armorMax)
    {
        const minRepairDeg = (isRepairKit)
            ? itemProps.MinRepairKitDegradation
            : itemProps.MinRepairDegradation;
        const maxRepairDeg = (isRepairKit)
            ? itemProps.MinRepairKitDegradation
            : itemProps.MaxRepairDegradation;
        const randomValue = RandomUtil.getFloat(minRepairDeg, maxRepairDeg);
        return randomValue * armorMax;
    }

    /**
     * Repair with repair kit
     * @param pmcData player profile
     * @param body endpoint response data
     * @param sessionID session id
     * @returns item event router action
     */
    static repair(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        const pmcInventory = pmcData.Inventory;
        const itemToRepair = RepairController.updateItemDurability(
            body.target,
            body.repairKitsInfo[0].count,
            pmcData,
            trye
        );
        output.profileChanges[sessionID].items.change.push(itemToRepair);
        for (const repairKit of body.repairKitsInfo)
        {
            const repairKitInInventory = pmcInventory.items.find(
                x => x._id === repairKit._id
            );
            const repairKitDetails =
                DatabaseServer.tables.templates.items[
                    repairKitInInventory._tpl
                ];
            const repairKitReductionAmount = repairKit.count;
            //reduce repair kit resource
            const maxRepairAmount = repairKitDetails._props.MaxRepairResource;
            if (!repairKitInInventory.upd.RepairKit?.Resource)
            {
                repairKitInInventory.upd.RepairKit = {
                    Resource: maxRepairAmount,
                };
            }
            repairKitInInventory.upd.RepairKit.Resource -=
                repairKitReductionAmount;
            output.profileChanges[sessionID].items.change.push(
                repairKitInInventory
            );
        }
        return output;
    }

    static isWeaponTemplate(tpl)
    {
        const itemTemplates = DatabaseServer.tables.templates.items;
        const baseItem = itemTemplates[tpl];
        const baseNode = itemTemplates[baseItem._parent];
        const parentNode = itemTemplates[baseNode._parent];
        return parentNode._id === ItemHelper.BASECLASS.Weapon;
    }
}

module.exports = RepairController;

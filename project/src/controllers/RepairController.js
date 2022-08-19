"use strict";

require("../Lib.js");

class RepairController
{
    /**
     * Repair with trader
     * @param pmcData player profile
     * @param body endpoint request data
     * @param sessionID session id
     * @returns item event router action
     */
    static traderRepair(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        const coef = TraderHelper.getLoyaltyLevel(
            body.tid,
            pmcData
        ).repair_price_coef;
        const quality = Number(
            TraderHelper.getTrader(body.tid, sessionID).repair.quality
        );
        const repairRate = coef <= 0 ? 1 : coef / 100 + 1;

        // find the item to repair
        for (const repairItem of body.repairItems)
        {
            let itemToRepair = pmcData.Inventory.items.find(
                x => x._id === repairItem._id
            );
            if (itemToRepair === undefined)
            {
                throw new Error(
                    `Item ${repairItem._id} not found, unable to repair`
                );
            }

            const itemToRepairDetails =
                DatabaseServer.getTables().templates.items[itemToRepair._tpl];
            const repairItemIsArmor =
                !!itemToRepairDetails._props.ArmorMaterial;

            itemToRepair = RepairHelper.updateItemDurability(
                itemToRepair,
                itemToRepairDetails,
                repairItemIsArmor,
                repairItem.count,
                false,
                quality !== 0 && RepairConfig.applyRandomizeDurabilityLoss
            );

            // get repair price and pay the money
            const itemRepairCost =
                DatabaseServer.getTables().templates.items[itemToRepair._tpl]
                    ._props.RepairCost;
            const repairCost = Math.round(
                itemRepairCost *
                    repairItem.count *
                    repairRate *
                    RepairConfig.priceMultiplier
            );

            Logger.debug(`item base repair cost: ${itemRepairCost}`, true);
            Logger.debug(
                `price multipler: ${RepairConfig.priceMultiplier}`,
                true
            );
            Logger.debug(`repair cost: ${repairCost}`, true);

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

            output.profileChanges[sessionID].items.change.push(itemToRepair);

            // add skill points for repairing weapons
            if (RepairHelper.isWeaponTemplate(itemToRepair._tpl))
            {
                const progress =
                    DatabaseServer.getTables().globals.config.SkillsSettings
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

    /**
     * Repair with repair kit
     * @param pmcData player profile
     * @param body endpoint request data
     * @param sessionID session id
     * @returns item event router action
     */
    static repairWithKit(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        const pmcInventory = pmcData.Inventory;

        let itemToRepair = pmcData.Inventory.items.find(
            x => x._id === body.target
        );
        if (itemToRepair === undefined)
        {
            throw new Error(`Item ${body.target} not found, unable to repair`);
        }

        const itemToRepairDetails =
            DatabaseServer.getTables().templates.items[itemToRepair._tpl];
        const repairItemIsArmor = !!itemToRepairDetails._props.ArmorMaterial;

        itemToRepair = RepairHelper.updateItemDurability(
            itemToRepair,
            itemToRepairDetails,
            repairItemIsArmor,
            body.repairKitsInfo[0].count,
            true
        );

        output.profileChanges[sessionID].items.change.push(itemToRepair);

        for (const repairKit of body.repairKitsInfo)
        {
            const repairKitInInventory = pmcInventory.items.find(
                x => x._id === repairKit._id
            );
            const repairKitDetails =
                DatabaseServer.getTables().templates.items[
                    repairKitInInventory._tpl
                ];
            const repairKitReductionAmount = repairKit.count;

            // Reduce repair kit resource
            const maxRepairAmount = repairKitDetails._props.MaxRepairResource;
            if (!repairKitInInventory.upd.RepairKit?.Resource)
            {
                repairKitInInventory.upd.RepairKit = {
                    Resource: maxRepairAmount,
                };
            }

            repairKitInInventory.upd.RepairKit.Resource -=
                repairKitReductionAmount;

            // Only increment skill when repairing weapons
            if (!repairItemIsArmor)
            {
                QuestHelper.rewardSkillPoints(
                    sessionID,
                    pmcData,
                    output,
                    "WeaponTreatment",
                    RepairConfig.weaponSkillRepairGain
                );
            }

            output.profileChanges[sessionID].items.change.push(
                repairKitInInventory
            );
        }

        return output;
    }
}

module.exports = RepairController;

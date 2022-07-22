"use strict";

require("../Lib.js");

class RepairController
{
    static isWeaponTemplate(tpl)
    {
        const itemTemplates = DatabaseServer.tables.templates.items;
        const baseItem = itemTemplates[tpl];
        const baseNode = itemTemplates[baseItem._parent];
        const parentNode = itemTemplates[baseNode._parent];
        return parentNode._id === ItemHelper.BASECLASS.Weapon;
    }

    static repair(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        const coef = TraderController.getLoyaltyLevel(body.tid, pmcData).repair_price_coef;
        const repairRate = (coef === 0) ? 1 : (coef / 100 + 1);

        // find the item to repair
        for (const repairItem of body.repairItems)
        {
            const itemToRepair = pmcData.Inventory.items.find((item) =>
            {
                return item._id === repairItem._id;
            });

            if (itemToRepair === undefined)
            {
                continue;
            }

            // get repair price and pay the money
            const repairCost = Math.round((DatabaseServer.tables.templates.items[itemToRepair._tpl]._props.RepairCost * repairItem.count * repairRate) * RepairConfig.priceMultiplier);
            const options = {
                "scheme_items": [
                    {
                        "id": repairItem._id,
                        "count": Math.round(repairCost)
                    }
                ],
                "tid": body.tid
            };

            output = PaymentController.payMoney(pmcData, options, sessionID, output);
            if (output.warnings.length > 0)
            {
                return output;
            }

            // change item durability
            const repairable = itemToRepair.upd.Repairable;
            const durability = repairable.Durability + repairItem.count;

            itemToRepair.upd.Repairable = {
                "Durability": (repairable.MaxDurability > durability) ? durability : repairable.MaxDurability,
                "MaxDurability": (repairable.MaxDurability > durability) ? durability : repairable.MaxDurability
            };

            // repairing mask cracks
            if ("FaceShield" in itemToRepair.upd && itemToRepair.upd.FaceShield.Hits > 0)
            {
                itemToRepair.upd.FaceShield.Hits = 0;
            }

            output.profileChanges[sessionID].items.change.push(itemToRepair);

            // add skill points for repairing weapons
            if (RepairController.isWeaponTemplate(itemToRepair._tpl))
            {
                const progress = DatabaseServer.tables.globals.config.SkillsSettings.WeaponTreatment.SkillPointsPerRepair;
                QuestHelper.rewardSkillPoints(sessionID, pmcData, output, "WeaponTreatment", progress);
            }
        }

        return output;
    }
}

module.exports = RepairController;

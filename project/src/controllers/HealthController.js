"use strict";

require("../Lib.js");

class HealthController
{
    static resetVitality(sessionID)
    {
        return HealthHelper.resetVitality(sessionID);
    }

    /* stores in-raid player health */
    static saveVitality(pmcData, info, sessionID)
    {
        HealthHelper.saveVitality(pmcData, info, sessionID);
    }

    static offraidHeal(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);

        // update medkit used (hpresource)
        const inventoryItem = pmcData.Inventory.items.find(
            item => item._id === body.item
        );
        if (!inventoryItem)
        {
            Logger.error(`offraidHeal: Item ${inventoryItem._id} not found`);
            // For now we just return nothing
            return;
        }

        if (!("upd" in inventoryItem))
        {
            inventoryItem.upd = {};
        }

        if ("MedKit" in inventoryItem.upd)
        {
            inventoryItem.upd.MedKit.HpResource -= body.count;
        }
        else
        {
            const maxhp = ItemHelper.getItem(inventoryItem._tpl)[1]._props
                .MaxHpResource;
            inventoryItem.upd.MedKit = { HpResource: maxhp - body.count };
        }

        if (inventoryItem.upd.MedKit.HpResource <= 0)
        {
            InventoryHelper.removeItem(pmcData, body.item, sessionID, output);
        }

        return output;
    }

    static offraidEat(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        let resourceLeft = 0;
        let maxResource = 0;

        for (const item of pmcData.Inventory.items)
        {
            if (item._id !== body.item)
            {
                continue;
            }

            maxResource = ItemHelper.getItem(item._tpl)[1]._props.MaxResource;

            if (maxResource > 1)
            {
                if (item.upd.FoodDrink === undefined)
                {
                    item.upd.FoodDrink = {
                        HpPercent: maxResource - body.count,
                    };
                }
                else
                {
                    item.upd.FoodDrink.HpPercent -= body.count;
                }

                resourceLeft = item.upd.FoodDrink.HpPercent;
            }

            break;
        }

        if (maxResource === 1 || resourceLeft < 1)
        {
            output = InventoryHelper.removeItem(
                pmcData,
                body.item,
                sessionID,
                output
            );
        }

        return output;
    }

    static healthTreatment(pmcData, info, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        const body = {
            Action: "RestoreHealth",
            tid: TraderHelper.TRADER.Therapist,
            scheme_items: info.items,
            type: "",
            item_id: "",
            count: 0,
            scheme_id: 0,
        };

        output = PaymentService.payMoney(pmcData, body, sessionID, output);
        if (output.warnings.length > 0)
        {
            return output;
        }

        const bodyParts = info.difference.BodyParts;
        const healthInfo = { IsAlive: true, Health: {} };

        for (const key in bodyParts)
        {
            const bodyPart = info.difference.BodyParts[key];

            healthInfo.Health[key] = {};
            healthInfo.Health[key].Current = Math.round(
                pmcData.Health.BodyParts[key].Health.Current + bodyPart.Health
            );

            if ("Effects" in bodyPart && bodyPart.Effects)
            {
                healthInfo.Health[key].Effects = bodyPart.Effects;
            }
        }

        healthInfo.Hydration =
            pmcData.Health.Hydration.Current + info.difference.Hydration;
        healthInfo.Energy =
            pmcData.Health.Energy.Current + info.difference.Energy;
        healthInfo.Temperature = pmcData.Health.Temperature.Current;

        HealthController.saveVitality(pmcData, healthInfo, sessionID);
        return output;
    }
}

module.exports = HealthController;

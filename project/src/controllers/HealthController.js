"use strict";

require("../Lib.js");

class HealthController
{
    /**
     * stores in-raid player health
     * @param pmcData Player profile
     * @param info Request data
     * @param sessionID
     * @param addEffects Should effects found be added or removed from profile
     */
    static saveVitality(pmcData, info, sessionID, addEffects = true)
    {
        HealthHelper.saveVitality(pmcData, info, sessionID, addEffects);
    }

    /**
     * When healing in menu
     * @param pmcData
     * @param body
     * @param sessionID
     * @returns
     */
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

    /**
     * Occurs on post-raid healing page
     * @param pmcData player profile
     * @param info Request data from client
     * @param sessionID Session id
     * @returns
     */
    static healthTreatment(pmcData, info, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        const payMoneyRequest = {
            Action: "RestoreHealth",
            tid: Traders.THERAPIST,
            scheme_items: info.items,
            type: "",
            item_id: "",
            count: 0,
            scheme_id: 0,
        };

        output = PaymentService.payMoney(
            pmcData,
            payMoneyRequest,
            sessionID,
            output
        );
        if (output.warnings.length > 0)
        {
            return output;
        }

        const bodyParts = info.difference.BodyParts;
        const healthRequest = {
            IsAlive: true,
            Health: {},
        };

        for (const bodyPartKey in bodyParts)
        {
            const bodyPart = info.difference.BodyParts[bodyPartKey];

            healthRequest.Health[bodyPartKey] = {};
            healthRequest.Health[bodyPartKey].Current = Math.round(
                pmcData.Health.BodyParts[bodyPartKey].Health.Current +
                    bodyPart.Health
            );

            if ("Effects" in bodyPart && bodyPart.Effects)
            {
                healthRequest.Health[bodyPartKey].Effects = bodyPart.Effects;
            }
        }

        healthRequest.Hydration =
            pmcData.Health.Hydration.Current + info.difference.Hydration;
        healthRequest.Energy =
            pmcData.Health.Energy.Current + info.difference.Energy;
        healthRequest.Temperature = pmcData.Health.Temperature.Current;

        HealthController.saveVitality(pmcData, healthRequest, sessionID, false);
        return output;
    }
}

module.exports = HealthController;

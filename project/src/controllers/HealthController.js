"use strict";

require("../Lib.js");

class HealthController
{
    static resetVitality(sessionID)
    {
        const profile = SaveServer.profiles[sessionID];

        profile.vitality = {
            "health": {
                "Hydration": 0,
                "Energy": 0,
                "Temperature": 0,
                "Head": 0,
                "Chest": 0,
                "Stomach": 0,
                "LeftArm": 0,
                "RightArm": 0,
                "LeftLeg": 0,
                "RightLeg": 0
            },
            "effects": {
                "Head": {},
                "Chest": {},
                "Stomach": {},
                "LeftArm": {},
                "RightArm": {},
                "LeftLeg": {},
                "RightLeg": {}
            }
        };

        return profile;
    }

    static offraidHeal(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);

        // update medkit used (hpresource)
        const inventoryItem = pmcData.Inventory.items.find(item => item._id === body.item);
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
            const maxhp = ItemHelper.getItem(inventoryItem._tpl)[1]._props.MaxHpResource;
            inventoryItem.upd.MedKit = { "HpResource": maxhp - body.count };
        }

        if (inventoryItem.upd.MedKit.HpResource <= 0)
        {
            InventoryController.removeItem(pmcData, body.item, sessionID, output);
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
                    item.upd.FoodDrink = { "HpPercent": maxResource - body.count };
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
            output = InventoryController.removeItem(pmcData, body.item, sessionID, output);
        }

        return output;
    }

    /* stores in-raid player health */
    static saveVitality(pmcData, info, sessionID)
    {
        const BodyPartsList = info.Health;
        const nodeHealth = SaveServer.profiles[sessionID].vitality.health;
        const nodeEffects = SaveServer.profiles[sessionID].vitality.effects;

        nodeHealth.Hydration = info.Hydration;
        nodeHealth.Energy = info.Energy;
        nodeHealth.Temperature = info.Temperature;

        for (const bodyPart in BodyPartsList)
        {
            if (BodyPartsList[bodyPart].Effects)
            {
                nodeEffects[bodyPart] = BodyPartsList[bodyPart].Effects;
            }

            if (info.IsAlive === true)
            {
                nodeHealth[bodyPart] = BodyPartsList[bodyPart].Current;
            }
            else
            {
                nodeHealth[bodyPart] = pmcData.Health.BodyParts[bodyPart].Health.Maximum * HealthConfig.healthMultipliers.death;
            }
        }

        HealthController.saveHealth(pmcData, sessionID);
        HealthController.saveEffects(pmcData, sessionID);
        HealthController.resetVitality(sessionID);

        pmcData.Health.UpdateTime = TimeUtil.getTimestamp();
    }

    static healthTreatment(pmcData, info, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        const body = {
            "Action": "RestoreHealth",
            "tid": TraderHelper.TRADER.Therapist,
            "scheme_items": info.items
        };

        output = PaymentController.payMoney(pmcData, body, sessionID, output);
        if (output.warnings.length > 0)
        {
            return output;
        }

        const BodyParts = info.difference.BodyParts;
        const healthInfo = { "IsAlive": true, "Health": {} };

        for (const key in BodyParts)
        {
            const bodyPart = info.difference.BodyParts[key];

            healthInfo.Health[key] = {};
            healthInfo.Health[key].Current = Math.round(pmcData.Health.BodyParts[key].Health.Current + bodyPart.Health);

            if ("Effects" in bodyPart && bodyPart.Effects)
            {
                healthInfo.Health[key].Effects = bodyPart.Effects;
            }
        }

        healthInfo.Hydration = pmcData.Health.Hydration.Current + info.difference.Hydration;
        healthInfo.Energy = pmcData.Health.Energy.Current + info.difference.Energy;
        healthInfo.Temperature = pmcData.Health.Temperature.Current;

        HealthController.saveVitality(pmcData, healthInfo, sessionID);
        return output;
    }

    static addEffect(pmcData, sessionID, info)
    {
        const bodyPart = pmcData.Health.BodyParts[info.bodyPart];

        if (!bodyPart.Effects)
        {
            bodyPart.Effects = {};
        }

        switch (info.effectType)
        {
            case "Fracture":
                bodyPart.Effects.Fracture = { "Time": -1 };
                break;
        }

        // delete empty property to prevent client bugs
        if (HealthController.isEmpty(bodyPart.Effects))
        {
            delete bodyPart.Effects;
        }
    }

    static saveHealth(pmcData, sessionID)
    {
        if (!HealthConfig.save.health)
        {
            return;
        }

        const nodeHealth = SaveServer.profiles[sessionID].vitality.health;

        for (const item in nodeHealth)
        {
            let target = nodeHealth[item];

            if (item === "Hydration" || item === "Energy" || item === "Temperature")
            {
                // set resources
                if (target > pmcData.Health[item].Maximum)
                {
                    target = pmcData.Health[item].Maximum;
                }

                pmcData.Health[item].Current = Math.round(target);
            }
            else
            {
                // set body part
                if (target > pmcData.Health.BodyParts[item].Health.Maximum)
                {
                    target = pmcData.Health.BodyParts[item].Health.Maximum;
                }

                if (target === 0)
                {
                    // blacked body part
                    target = Math.round(pmcData.Health.BodyParts[item].Health.Maximum * HealthConfig.healthMultipliers.blacked);
                }

                pmcData.Health.BodyParts[item].Health.Current = target;
            }
        }
    }

    static saveEffects(pmcData, sessionID)
    {
        if (!HealthConfig.save.effects)
        {
            return;
        }

        const nodeEffects = SaveServer.profiles[sessionID].vitality.effects;

        for (const bodyPart in nodeEffects)
        {
            // clear effects
            delete pmcData.Health.BodyParts[bodyPart].Effects;

            // add new
            for (const effect in nodeEffects[bodyPart])
            {
                switch (effect)
                {
                    case "Fracture":
                        HealthController.addEffect(pmcData, sessionID, { bodyPart: bodyPart, effectType: "Fracture" });
                        break;
                }
            }
        }
    }

    static isEmpty(map)
    {
        for (const key in map)
        {
            if (key in map)
            {
                return false;
            }
        }

        return true;
    }
}

module.exports = HealthController;

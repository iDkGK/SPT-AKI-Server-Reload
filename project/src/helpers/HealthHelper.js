"use strict";

require("../Lib.js");

class HealthHelper
{
    static resetVitality(sessionID)
    {
        const profile = SaveServer.getProfile(sessionID);
        if (!profile.vitality) // Occurs on newly created profiles
        {
            profile.vitality = {
                health: null,
                effects: null
            };
        }
        profile.vitality.health = {
            Hydration: 0,
            Energy: 0,
            Temperature: 0,
            Head: 0,
            Chest: 0,
            Stomach: 0,
            LeftArm: 0,
            RightArm: 0,
            LeftLeg: 0,
            RightLeg: 0
        };
        profile.vitality.effects = {
            Head: {},
            Chest: {},
            Stomach: {},
            LeftArm: {},
            RightArm: {},
            LeftLeg: {},
            RightLeg: {}
        };
        return profile;
    }

    static saveVitality(pmcData, info, sessionID)
    {
        const postRaidBodyParts = info.Health; // post raid health settings
        const profile = SaveServer.getProfile(sessionID);
        const nodeHealth = profile.vitality.health;
        const nodeEffects = profile.vitality.effects;
        nodeHealth.Hydration = info.Hydration;
        nodeHealth.Energy = info.Energy;
        nodeHealth.Temperature = info.Temperature;
        for (const bodyPart in postRaidBodyParts)
        {
            if (postRaidBodyParts[bodyPart].Effects)
            {
                nodeEffects[bodyPart] = postRaidBodyParts[bodyPart].Effects;
            }

            if (info.IsAlive === true) // is player alive, not is limb alive
            {
                nodeHealth[bodyPart] = postRaidBodyParts[bodyPart].Current;
            }
            else
            {
                nodeHealth[bodyPart] = pmcData.Health.BodyParts[bodyPart].Health.Maximum * HealthConfig.healthMultipliers.death;
            }
        }
        HealthHelper.saveHealth(pmcData, sessionID);
        HealthHelper.saveEffects(pmcData, sessionID);
        HealthHelper.resetVitality(sessionID);
        pmcData.Health.UpdateTime = TimeUtil.getTimestamp();
    }

    static saveHealth(pmcData, sessionID)
    {
        if (!HealthConfig.save.health)
        {
            return;
        }
        const nodeHealth = SaveServer.getProfile(sessionID).vitality.health;
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
        const nodeEffects = JsonUtil.clone(SaveServer.getProfile(sessionID).vitality.effects);
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
                        HealthHelper.addEffect(pmcData, sessionID, { bodyPart: bodyPart, effectType: "Fracture" });
                        break;
                    default:
                        Logger.warning(`${effect} case not handled in saveEffects()!`);
                        break;
                }
            }
        }
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
            default:
                Logger.debug(`unhandled effect ${info.effectType} in addEffects()`);
                break;
        }

        // delete empty property to prevent client bugs
        if (HealthHelper.isEmpty(bodyPart.Effects))
        {
            delete bodyPart.Effects;
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

module.exports = HealthHelper;
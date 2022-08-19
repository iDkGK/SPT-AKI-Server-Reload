"use strict";

require("../Lib.js");

class HealthHelper
{
    /**
     * Resets the profiles vitality/healh and vitality/effects properties to their defaults
     * @param sessionID Session Id
     * @returns updated profile
     */
    static resetVitality(sessionID)
    {
        const profile = SaveServer.getProfile(sessionID);

        if (!profile.vitality)
        {
            // Occurs on newly created profiles
            profile.vitality = {
                health: null,
                effects: null,
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
            RightLeg: 0,
        };

        profile.vitality.effects = {
            Head: {},
            Chest: {},
            Stomach: {},
            LeftArm: {},
            RightArm: {},
            LeftLeg: {},
            RightLeg: {},
        };

        return profile;
    }

    /**
     * Update player profile with changes from request object
     * @param pmcData Player profile
     * @param info Request object
     * @param sessionID Session id
     * @param addEffects Should effects be added or removed (default - add)
     */
    static saveVitality(pmcData, info, sessionID, addEffects = true)
    {
        const postRaidBodyParts = info.Health; // post raid health settings
        const profile = SaveServer.getProfile(sessionID);
        const profileHealth = profile.vitality.health;
        const profileEffects = profile.vitality.effects;

        profileHealth.Hydration = info.Hydration;
        profileHealth.Energy = info.Energy;
        profileHealth.Temperature = info.Temperature;

        for (const bodyPart in postRaidBodyParts)
        {
            if (postRaidBodyParts[bodyPart].Effects)
            {
                profileEffects[bodyPart] = postRaidBodyParts[bodyPart].Effects;
            }

            if (info.IsAlive === true)
            {
                // is player alive, not is limb alive
                profileHealth[bodyPart] = postRaidBodyParts[bodyPart].Current;
            }
            else
            {
                profileHealth[bodyPart] =
                    pmcData.Health.BodyParts[bodyPart].Health.Maximum *
                    HealthConfig.healthMultipliers.death;
            }
        }

        HealthHelper.saveHealth(pmcData, sessionID);
        HealthHelper.saveEffects(pmcData, sessionID, addEffects);
        HealthHelper.resetVitality(sessionID);

        pmcData.Health.UpdateTime = TimeUtil.getTimestamp();
    }

    static saveHealth(pmcData, sessionID)
    {
        if (!HealthConfig.save.health)
        {
            return;
        }

        const profileHealth = SaveServer.getProfile(sessionID).vitality.health;
        for (const healthModifier in profileHealth)
        {
            let target = profileHealth[healthModifier];

            if (
                ["Hydration", "Energy", "Temperature"].includes(healthModifier)
            )
            {
                // set resources
                if (target > pmcData.Health[healthModifier].Maximum)
                {
                    target = pmcData.Health[healthModifier].Maximum;
                }

                pmcData.Health[healthModifier].Current = Math.round(target);
            }
            else
            {
                // set body part
                if (
                    target >
                    pmcData.Health.BodyParts[healthModifier].Health.Maximum
                )
                {
                    target =
                        pmcData.Health.BodyParts[healthModifier].Health.Maximum;
                }

                if (target === 0)
                {
                    // blacked body part
                    target = Math.round(
                        pmcData.Health.BodyParts[healthModifier].Health
                            .Maximum * HealthConfig.healthMultipliers.blacked
                    );
                }

                pmcData.Health.BodyParts[healthModifier].Health.Current =
                    target;
            }
        }
    }

    /**
     * Save effects to profile
     * Works by removing all effects and adding them back from profile
     * Remoces empty 'Effects' objects if found
     * @param pmcData Player profile
     * @param sessionID Session id
     * @param addEffects Should effects be added back to profile
     * @returns
     */
    static saveEffects(pmcData, sessionID, addEffects)
    {
        if (!HealthConfig.save.effects)
        {
            return;
        }

        const nodeEffects = JsonUtil.clone(
            SaveServer.getProfile(sessionID).vitality.effects
        );

        for (const bodyPart in nodeEffects)
        {
            // clear effects from profile bodypart
            delete pmcData.Health.BodyParts[bodyPart].Effects;

            // add new effects
            if (addEffects)
            {
                for (const effectValue in nodeEffects[bodyPart])
                {
                    // data can be index or the effect string (e.g. "Fracture") itself
                    const effect = /^-?\d+$/.test(effectValue) // is an int
                        ? nodeEffects[bodyPart][effectValue]
                        : effectValue;

                    switch (effect)
                    {
                        case Effect.FRACTURE:
                            HealthHelper.addEffect(
                                pmcData,
                                bodyPart,
                                Effect.FRACTURE
                            );
                            break;
                        case Effect.LIGHT_BLEEDING:
                            HealthHelper.addEffect(
                                pmcData,
                                bodyPart,
                                Effect.LIGHT_BLEEDING
                            );
                            break;
                        case Effect.HEAVY_BLEEDING:
                            HealthHelper.addEffect(
                                pmcData,
                                bodyPart,
                                Effect.HEAVY_BLEEDING
                            );
                            break;
                        default:
                            Logger.warning(
                                `$Add ${effect} on ${bodyPart} case not handled in saveEffects()!`
                            );
                            break;
                    }
                }
            }
        }
    }

    /**
     * Add effect to body part in profile
     * @param pmcData Player profile
     * @param effectBodyPart body part to edit
     * @param effectType Effect to add to body part
     */
    static addEffect(pmcData, effectBodyPart, effectType)
    {
        const profileBodyPart = pmcData.Health.BodyParts[effectBodyPart];

        if (!profileBodyPart.Effects)
        {
            profileBodyPart.Effects = {};
        }

        switch (effectType)
        {
            case "Fracture":
                profileBodyPart.Effects.Fracture = { Time: -1 };
                break;
            default:
                Logger.debug(`unhandled effect ${effectType} in addEffects()`);
                break;
        }

        // Delete empty property to prevent client bugs
        if (HealthHelper.isEmpty(profileBodyPart.Effects))
        {
            delete profileBodyPart.Effects;
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

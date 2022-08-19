"use strict";

require("../Lib.js");

class HealthCallbacks
{
    static onSaveLoad(profile)
    {
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
     * Custom aki server request found in modules/HealthSynchronizer.cs
     * @param url
     * @param info HealthListener.Instance.CurrentHealth class
     * @param sessionID session id
     * @returns empty response, no data sent back to client
     */
    static syncHealth(url, info, sessionID)
    {
        HealthController.saveVitality(
            ProfileHelper.getPmcProfile(sessionID),
            info,
            sessionID
        );
        return HttpResponseUtil.emptyResponse();
    }

    static offraidEat(pmcData, body, sessionID)
    {
        return HealthController.offraidEat(pmcData, body, sessionID);
    }

    static offraidHeal(pmcData, body, sessionID)
    {
        return HealthController.offraidHeal(pmcData, body, sessionID);
    }

    static healthTreatment(pmcData, info, sessionID)
    {
        return HealthController.healthTreatment(pmcData, info, sessionID);
    }
}

module.exports = HealthCallbacks;

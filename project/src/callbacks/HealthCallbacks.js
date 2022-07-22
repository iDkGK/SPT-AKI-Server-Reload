"use strict";

require("../Lib.js");

class HealthCallbacks
{
    static onLoad(sessionID)
    {
        return HealthController.resetVitality(sessionID);
    }

    static syncHealth(url, info, sessionID)
    {
        HealthController.saveVitality(ProfileController.getPmcProfile(sessionID), info, sessionID);
        return HttpResponse.emptyResponse();
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

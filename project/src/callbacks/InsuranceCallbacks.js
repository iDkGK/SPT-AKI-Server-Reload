"use strict";

require("../Lib.js");

class InsuranceCallbacks
{
    static onSaveLoad(profile)
    {
        if (!("insurance" in profile))
        {
            profile.insurance = [];
        }
        return profile;
    }

    static update(timeSinceLastRun)
    {
        if (timeSinceLastRun > InsuranceConfig.runIntervalSeconds)
        {
            InsuranceController.processReturn();
            return true;
        }
        return false;
    }

    static getInsuranceCost(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            InsuranceController.cost(info, sessionID)
        );
    }

    static insure(pmcData, body, sessionID)
    {
        return InsuranceController.insure(pmcData, body, sessionID);
    }
}

module.exports = InsuranceCallbacks;

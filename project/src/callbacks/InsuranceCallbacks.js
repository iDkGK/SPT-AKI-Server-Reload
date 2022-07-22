"use strict";

require("../Lib.js");

class InsuranceCallbacks
{
    static onLoad(sessionID)
    {
        return InsuranceController.onLoad(sessionID);
    }

    static getInsuranceCost(url, info, sessionID)
    {
        return HttpResponse.getBody(InsuranceController.cost(info, sessionID));
    }

    static insure(pmcData, body, sessionID)
    {
        return InsuranceController.insure(pmcData, body, sessionID);
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
}

module.exports = InsuranceCallbacks;

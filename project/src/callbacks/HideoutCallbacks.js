"use strict";

require("../Lib.js");

class HideoutCallbacks
{
    static upgrade(pmcData, body, sessionID)
    {
        return HideoutController.upgrade(pmcData, body, sessionID);
    }

    static upgradeComplete(pmcData, body, sessionID)
    {
        return HideoutController.upgradeComplete(pmcData, body, sessionID);
    }

    static putItemsInAreaSlots(pmcData, body, sessionID)
    {
        return HideoutController.putItemsInAreaSlots(pmcData, body, sessionID);
    }

    static takeItemsFromAreaSlots(pmcData, body, sessionID)
    {
        return HideoutController.takeItemsFromAreaSlots(
            pmcData,
            body,
            sessionID
        );
    }

    static toggleArea(pmcData, body, sessionID)
    {
        return HideoutController.toggleArea(pmcData, body, sessionID);
    }

    static singleProductionStart(pmcData, body, sessionID)
    {
        return HideoutController.singleProductionStart(
            pmcData,
            body,
            sessionID
        );
    }

    static scavCaseProductionStart(pmcData, body, sessionID)
    {
        return HideoutController.scavCaseProductionStart(
            pmcData,
            body,
            sessionID
        );
    }

    static continuousProductionStart(pmcData, body, sessionID)
    {
        return HideoutController.continuousProductionStart(
            pmcData,
            body,
            sessionID
        );
    }

    static takeProduction(pmcData, body, sessionID)
    {
        return HideoutController.takeProduction(pmcData, body, sessionID);
    }

    static update(timeSinceLastRun)
    {
        if (timeSinceLastRun > HideoutConfig.runIntervalSeconds)
        {
            HideoutController.update();
            return true;
        }

        return false;
    }
}

module.exports = HideoutCallbacks;

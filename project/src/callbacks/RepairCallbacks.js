"use strict";

require("../Lib.js");

class RepairCallbacks
{
    static traderRepair(pmcData, body, sessionID)
    {
        return RepairController.traderRepair(pmcData, body, sessionID);
    }

    static repair(pmcData, body, sessionID)
    {
        return RepairController.repair(pmcData, body, sessionID);
    }
}

module.exports = RepairCallbacks;

"use strict";

require("../Lib.js");

class RepairCallbacks
{
    static repair(pmcData, body, sessionID)
    {
        return RepairController.repair(pmcData, body, sessionID);
    }
}

module.exports = RepairCallbacks;

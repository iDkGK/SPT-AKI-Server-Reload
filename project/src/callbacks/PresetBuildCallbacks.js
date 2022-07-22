"use strict";

require("../Lib.js");

class PresetBuildCallbacks
{
    static getHandbookUserlist(url, info, sessionID)
    {
        return HttpResponse.getBody(PresetBuildController.getUserBuilds(sessionID));
    }

    static saveBuild(pmcData, body, sessionID)
    {
        return PresetBuildController.saveBuild(pmcData, body, sessionID);
    }

    static removeBuild(pmcData, body, sessionID)
    {
        return PresetBuildController.removeBuild(pmcData, body, sessionID);
    }
}

module.exports = PresetBuildCallbacks;

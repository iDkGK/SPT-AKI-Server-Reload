"use strict";

require("../Lib.js");

class InraidCallbacks
{
    static onLoad(sessionID)
    {
        return InraidController.onLoad(sessionID);
    }

    static registerPlayer(url, info, sessionID)
    {
        InraidController.addPlayer(sessionID, info.locationId);
        return HttpResponse.nullResponse();
    }

    static saveProgress(url, info, sessionID)
    {
        InraidController.saveProgress(info, sessionID);
        return HttpResponse.nullResponse();
    }

    static getRaidEndState()
    {
        return HttpResponse.noBody(InraidConfig.MIAOnRaidEnd);
    }

    static getRaidMenuSettings(url, info, sessionID)
    {
        return HttpResponse.noBody(InraidConfig.raidMenuSettings);
    }

    static getWeaponDurability(url, info, sessionID)
    {
        return HttpResponse.noBody(InraidConfig.save.durability);
    }
}

module.exports = InraidCallbacks;

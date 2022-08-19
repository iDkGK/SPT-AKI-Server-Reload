"use strict";

require("../Lib.js");

class InraidCallbacks
{
    static onSaveLoad(profile)
    {
        if (!("inraid" in profile))
        {
            profile.inraid = {
                location: "none",
                character: "none",
            };
        }

        return profile;
    }

    static registerPlayer(url, info, sessionID)
    {
        InraidController.addPlayer(sessionID, info);
        return HttpResponseUtil.nullResponse();
    }

    static saveProgress(url, info, sessionID)
    {
        InraidController.saveProgress(info, sessionID);
        return HttpResponseUtil.nullResponse();
    }

    static getRaidEndState()
    {
        return HttpResponseUtil.noBody(InraidConfig.MIAOnRaidEnd);
    }

    static getRaidMenuSettings(url, info, sessionID)
    {
        return HttpResponseUtil.noBody(InraidConfig.raidMenuSettings);
    }

    static getWeaponDurability(url, info, sessionID)
    {
        return HttpResponseUtil.noBody(InraidConfig.save.durability);
    }

    static getAirdropConfig(url, info, sessionID)
    {
        return HttpResponseUtil.noBody(AirdropConfig);
    }
}

module.exports = InraidCallbacks;

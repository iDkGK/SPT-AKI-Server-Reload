"use strict";

require("../Lib.js");

class ProfileCallbacks
{
    static onLoad(sessionID)
    {
        return ProfileController.onLoad(sessionID);
    }

    static createProfile(url, info, sessionID)
    {
        ProfileController.createProfile(info, sessionID);
        return HttpResponse.getBody({ "uid": `pmc${sessionID}` });
    }

    static getProfileData(url, info, sessionID)
    {
        return HttpResponse.getBody(ProfileController.getCompleteProfile(sessionID));
    }

    static regenerateScav(url, info, sessionID)
    {
        return HttpResponse.getBody([ProfileController.generatePlayerScav(sessionID)]);
    }

    static changeVoice(url, info, sessionID)
    {
        ProfileController.changeVoice(info, sessionID);
        return HttpResponse.nullResponse();
    }

    static changeNickname(url, info, sessionID)
    {
        const output = ProfileController.changeNickname(info, sessionID);

        if (output === "taken")
        {
            return HttpResponse.getBody(null, 255, "The nickname is already in use");
        }

        if (output === "tooshort")
        {
            return HttpResponse.getBody(null, 1, "The nickname is too short");
        }

        return HttpResponse.getBody({
            "status": 0,
            "nicknamechangedate": TimeUtil.getTimestamp()
        });
    }

    static validateNickname(url, info, sessionID)
    {
        const output = ProfileController.validateNickname(info, sessionID);

        if (output === "taken")
        {
            return HttpResponse.getBody(null, 255, "The nickname is already in use");
        }

        if (output === "tooshort")
        {
            return HttpResponse.getBody(null, 256, "The nickname is too short");
        }

        return HttpResponse.getBody({ "status": "ok" });
    }

    static getReservedNickname(url, info, sessionID)
    {
        return HttpResponse.getBody("SPTarkov");
    }

    static getProfileStatus(url, info, sessionID)
    {
        return HttpResponse.getBody([
            {
                "profileid": `scav${sessionID}`,
                "status": "Free",
                "sid": "",
                "ip": "",
                "port": 0
            },
            {
                "profileid": `pmc${sessionID}`,
                "status": "Free",
                "sid": "",
                "ip": "",
                "port": 0
            }
        ]);
    }
}

module.exports = ProfileCallbacks;

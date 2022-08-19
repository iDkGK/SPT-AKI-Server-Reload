"use strict";

require("../Lib.js");

class ProfileCallbacks
{
    static onSaveLoad(profile)
    {
        if (profile.characters === undefined)
        {
            profile.characters = {
                pmc: {},
                scav: {},
            };
        }
        return profile;
    }

    static createProfile(url, info, sessionID)
    {
        ProfileController.createProfile(info, sessionID);
        return HttpResponseUtil.getBody({ uid: `pmc${sessionID}` });
    }

    static getProfileData(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            ProfileController.getCompleteProfile(sessionID)
        );
    }

    static regenerateScav(url, info, sessionID)
    {
        return HttpResponseUtil.getBody([
            ProfileController.generatePlayerScav(sessionID),
        ]);
    }

    static changeVoice(url, info, sessionID)
    {
        ProfileController.changeVoice(info, sessionID);
        return HttpResponseUtil.nullResponse();
    }

    static changeNickname(url, info, sessionID)
    {
        const output = ProfileController.changeNickname(info, sessionID);

        if (output === "taken")
        {
            return HttpResponseUtil.getBody(
                null,
                255,
                "The nickname is already in use"
            );
        }

        if (output === "tooshort")
        {
            return HttpResponseUtil.getBody(
                null,
                1,
                "The nickname is too short"
            );
        }

        return HttpResponseUtil.getBody({
            status: 0,
            nicknamechangedate: TimeUtil.getTimestamp(),
        });
    }

    static validateNickname(url, info, sessionID)
    {
        const output = ProfileController.validateNickname(info, sessionID);

        if (output === "taken")
        {
            return HttpResponseUtil.getBody(
                null,
                255,
                "The nickname is already in use"
            );
        }

        if (output === "tooshort")
        {
            return HttpResponseUtil.getBody(
                null,
                256,
                "The nickname is too short"
            );
        }

        return HttpResponseUtil.getBody({ status: "ok" });
    }

    static getReservedNickname(url, info, sessionID)
    {
        return HttpResponseUtil.getBody("SPTarkov");
    }

    /**
     * Called when creating a character, when you choose a character face/voice
     * @param url
     * @param info response (empty)
     * @param sessionID
     * @returns
     */
    static getProfileStatus(url, info, sessionID)
    {
        const response = {
            maxPveCountExceeded: false,
            profiles: [
                {
                    profileid: `scav${sessionID}`,
                    status: "Free",
                    sid: "",
                    ip: "",
                    port: 0,
                },
                {
                    profileid: `pmc${sessionID}`,
                    status: "Free",
                    sid: "",
                    ip: "",
                    port: 0,
                },
            ],
        };

        return HttpResponseUtil.getBody(response);
    }

    static searchFriend(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            ProfileController.getFriends(info, sessionID)
        );
    }

    static getMiniProfile(url, info, sessionID)
    {
        return HttpResponseUtil.noBody(
            ProfileController.getMiniProfile(sessionID)
        );
    }

    static getAllMiniProfiles(url, info, sessionID)
    {
        return HttpResponseUtil.noBody(ProfileController.getMiniProfiles());
    }
}

module.exports = ProfileCallbacks;

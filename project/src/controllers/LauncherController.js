"use strict";

require("../Lib.js");

class LauncherController
{
    static find(sessionID)
    {
        if (sessionIdKey in SaveServer.getProfiles())
        {
            return SaveServer.getProfile(sessionIdKey).info;
        }

        return undefined;
    }

    static getMiniProfiles()
    {
        const miniProfiles = [];

        for (const sessionIdKey in SaveServer.getProfiles())
        {
            miniProfiles.push(ProfileHelper.getMiniProfile(sessionIdKey));
        }

        return miniProfiles;
    }

    static isWiped(sessionID)
    {
        return SaveServer.getProfile(sessionID).info.wipe;
    }

    static login(info)
    {
        for (const sessionID in SaveServer.getProfiles())
        {
            const account = SaveServer.getProfile(sessionID).info;
            if (info.username === account.username)
            {
                return sessionID;
            }
        }

        return "";
    }

    static register(info)
    {
        for (const sessionID in SaveServer.getProfiles())
        {
            if (
                info.username === SaveServer.getProfile(sessionID).info.username
            )
            {
                return "";
            }
        }

        return LauncherController.createAccount(info);
    }

    static createAccount(info)
    {
        const sessionID = HashUtil.generate();
        const newProfileDetails = {
            id: sessionID,
            username: info.username,
            password: info.password,
            wipe: true,
            edition: info.edition,
        };
        SaveServer.createProfile(newProfileDetails);

        SaveServer.loadProfile(sessionID);
        SaveServer.saveProfile(sessionID);
        return sessionID;
    }

    static changeUsername(info)
    {
        const sessionID = LauncherController.login(info);

        if (sessionID)
        {
            SaveServer.getProfile(sessionID).info.username = info.change;
        }

        return sessionID;
    }

    static changePassword(info)
    {
        const sessionID = LauncherController.login(info);

        if (sessionID)
        {
            SaveServer.getProfile(sessionID).info.password = info.change;
        }

        return sessionID;
    }

    static wipe(info)
    {
        const sessionID = LauncherController.login(info);

        if (sessionID)
        {
            const profile = SaveServer.getProfile(sessionID);
            profile.info.edition = info.edition;
            profile.info.wipe = true;
        }

        return sessionID;
    }

    static getCompatibleTarkovVersion()
    {
        return AkiConfig.compatibleTarkovVersion;
    }
}

module.exports = LauncherController;

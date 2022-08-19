"use strict";

require("../Lib.js");

class LauncherController
{
    static connect()
    {
        return {
            backendUrl: HttpServerHelper.getBackendUrl(),
            name: "SPT-AKI Server",
            editions: Object.keys(
                DatabaseServer.getTables().templates.profiles
            ),
        };
    }

    static find(sessionIdKey)
    {
        if (sessionIdKey in SaveServer.getProfiles())
        {
            return SaveServer.getProfile(sessionIdKey).info;
        }

        return undefined;
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
        const sessionID = login(info);

        if (sessionID)
        {
            SaveServer.getProfile(sessionID).info.username = info.change;
        }

        return sessionID;
    }

    static changePassword(info)
    {
        const sessionID = login(info);

        if (sessionID)
        {
            SaveServer.getProfile(sessionID).info.password = info.change;
        }

        return sessionID;
    }

    static wipe(info)
    {
        const sessionID = login(info);

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
        return CoreConfig.compatibleTarkovVersion;
    }
}

module.exports = LauncherController;

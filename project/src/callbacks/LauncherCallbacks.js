"use strict";

const Watermark = require("../utils/Watermark.js");

require("../Lib.js");

class LauncherCallbacks
{
    static connect()
    {
        return HttpResponse.noBody({
            "backendUrl": HttpServer.getBackendUrl(),
            "name": "SPT-AKI Server",
            "editions": Object.keys(DatabaseServer.tables.templates.profiles)
        });
    }

    static login(url, info, sessionID)
    {
        ProfileController.sessionId = sessionID;

        const output = LauncherController.login(info);
        return (!output) ? "FAILED" : output;
    }

    static register(url, info, sessionID)
    {
        const output = LauncherController.register(info);
        return (!output) ? "FAILED" : "OK";
    }

    static get(url, info, sessionID)
    {
        const output = LauncherController.find(LauncherController.login(info));
        return HttpResponse.noBody(output);
    }

    static changeUsername(url, info, sessionID)
    {
        const output = LauncherController.changeUsername(info);
        return (!output) ? "FAILED" : "OK";
    }

    static changePassword(url, info, sessionID)
    {
        const output = LauncherController.changePassword(info);
        return (!output) ? "FAILED" : "OK";
    }

    static wipe(url, info, sessionID)
    {
        const output = LauncherController.wipe(info);
        return (!output) ? "FAILED" : "OK";
    }

    static getMiniProfile(url, info, sessionID)
    {
        return HttpResponse.noBody(ProfileController.getMiniProfile(sessionID));
    }

    static getAllMiniProfiles(url, info, sessionID)
    {
        return HttpResponse.noBody(LauncherController.getMiniProfiles());
    }

    static getServerVersion()
    {
        return HttpResponse.noBody(Watermark.getVersionTag());
    }

    static ping(url, info, sessionID)
    {
        return HttpResponse.noBody("pong!");
    }

    static removeProfile(url, info, sessionID)
    {
        return HttpResponse.noBody(SaveServer.removeProfile(sessionID));
    }

    static getCompatibleTarkovVersion()
    {
        return HttpResponse.noBody(LauncherController.getCompatibleTarkovVersion());
    }
}

module.exports = LauncherCallbacks;

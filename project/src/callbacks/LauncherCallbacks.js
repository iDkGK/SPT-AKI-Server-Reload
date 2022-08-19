"use strict";

require("../Lib.js");

class LauncherCallbacks
{
    static connect()
    {
        return HttpResponseUtil.noBody(LauncherController.connect());
    }

    static login(url, info, sessionID)
    {
        const output = LauncherController.login(info);
        return !output ? "FAILED" : output;
    }

    static register(url, info, sessionID)
    {
        const output = LauncherController.register(info);
        return !output ? "FAILED" : "OK";
    }

    static get(url, info, sessionID)
    {
        const output = LauncherController.find(LauncherController.login(info));
        return HttpResponseUtil.noBody(output);
    }

    static changeUsername(url, info, sessionID)
    {
        const output = LauncherController.changeUsername(info);
        return !output ? "FAILED" : "OK";
    }

    static changePassword(url, info, sessionID)
    {
        const output = LauncherController.changePassword(info);
        return !output ? "FAILED" : "OK";
    }

    static wipe(url, info, sessionID)
    {
        const output = LauncherController.wipe(info);
        return !output ? "FAILED" : "OK";
    }

    static getServerVersion()
    {
        const x = HttpResponseUtil.noBody(Watermark.getVersionTag());
        return x;
    }

    static ping(url, info, sessionID)
    {
        return HttpResponseUtil.noBody("pong!");
    }

    static removeProfile(url, info, sessionID)
    {
        return HttpResponseUtil.noBody(SaveServer.removeProfile(sessionID));
    }

    static getCompatibleTarkovVersion()
    {
        return HttpResponseUtil.noBody(
            LauncherController.getCompatibleTarkovVersion()
        );
    }
}

module.exports = LauncherCallbacks;

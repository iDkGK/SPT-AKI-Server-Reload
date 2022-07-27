"use strict";

require("../Lib.js");

class GameCallbacks
{
    static versionValidate(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static gameStart(url, info, sessionID)
    {
        GameController.gameStart(url, info, sessionID);
        return HttpResponse.getBody({
            utc_time: new Date().getTime() / 1000,
        });
    }

    static gameLogout(url, info, sessionID)
    {
        return HttpResponse.getBody({
            status: "ok",
        });
    }

    static getGameConfig(url, info, sessionID)
    {
        return HttpResponse.getBody(GameController.getGameConfig(sessionID));
    }

    static getServer(url, info, sessionID)
    {
        return HttpResponse.getBody([
            {
                ip: HttpConfig.ip,
                port: HttpConfig.port,
            },
        ]);
    }

    static validateGameVersion(url, info, sessionID)
    {
        return HttpResponse.getBody({
            isvalid: true,
            latestVersion: "",
        });
    }

    static gameKeepalive(url, info, sessionID)
    {
        return HttpResponse.getBody({
            msg: "OK",
        });
    }

    static getVersion(url, info, sessionID)
    {
        return HttpResponse.noBody({
            Version: Watermark.versionLabel,
        });
    }
}

module.exports = GameCallbacks;

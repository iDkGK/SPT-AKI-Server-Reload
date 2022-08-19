"use strict";

require("../Lib.js");

class GameCallbacks
{
    static versionValidate(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static gameStart(url, info, sessionID)
    {
        GameController.gameStart(url, info, sessionID);
        return HttpResponseUtil.getBody({
            utc_time: new Date().getTime() / 1000,
        });
    }

    static gameLogout(url, info, sessionID)
    {
        return HttpResponseUtil.getBody({
            status: "ok",
        });
    }

    static getGameConfig(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            GameController.getGameConfig(sessionID)
        );
    }

    static getServer(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(GameController.getServer());
    }

    static validateGameVersion(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(GameController.getValidGameVersion());
    }

    static gameKeepalive(url, info, sessionID)
    {
        return HttpResponseUtil.getBody({
            msg: "OK",
        });
    }

    static getVersion(url, info, sessionID)
    {
        return HttpResponseUtil.noBody({
            Version: Watermark.getVersionLabel(),
        });
    }

    static reportNickname(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }
}

module.exports = GameCallbacks;

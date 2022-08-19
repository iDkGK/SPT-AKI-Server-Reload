"use strict";

require("../Lib.js");

class BotCallbacks
{
    static getBotLimit(url, info, sessionID)
    {
        const splittedUrl = url.split("/");
        const type = splittedUrl[splittedUrl.length - 1];
        return HttpResponseUtil.noBody(
            BotController.getBotPresetGenerationLimit(type)
        );
    }

    static getBotDifficulty(url, info, sessionID)
    {
        const splittedUrl = url.split("/");
        const type = splittedUrl[splittedUrl.length - 2].toLowerCase();
        const difficulty = splittedUrl[splittedUrl.length - 1];
        if (difficulty === "core")
        {
            return HttpResponseUtil.noBody(
                BotController.getBotCoreDifficulty()
            );
        }

        return HttpResponseUtil.noBody(
            BotController.getBotDifficulty(type, difficulty)
        );
    }

    static generateBots(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            BotController.generate(sessionID, info)
        );
    }

    static getBotCap()
    {
        return HttpResponseUtil.noBody(BotController.getBotCap());
    }
}

module.exports = BotCallbacks;

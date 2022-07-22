"use strict";

require("../Lib.js");

class BotCallbacks
{
    static getBotLimit(url, info, sessionID)
    {
        const splittedUrl = url.split("/");
        const type = splittedUrl[splittedUrl.length - 1];
        return HttpResponse.noBody(BotController.getBotLimit(type));
    }

    static getBotDifficulty(url, info, sessionID)
    {
        const splittedUrl = url.split("/");
        const type = splittedUrl[splittedUrl.length - 2].toLowerCase();
        const difficulty = splittedUrl[splittedUrl.length - 1];
        return HttpResponse.noBody(BotController.getBotDifficulty(type, difficulty));
    }

    static generateBots(url, info, sessionID)
    {
        return HttpResponse.getBody(BotController.generate(info));
    }

    static getBotCap()
    {
        return HttpResponse.noBody(BotController.getBotCap());
    }
}

module.exports = BotCallbacks;

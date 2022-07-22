"use strict";

require("../Lib.js");

class ModCallbacks
{
    static load()
    {
        ModLoader.load();
    }

    static sendBundle(sessionID, req, resp, body)
    {
        Logger.info(`[BUNDLE]: ${req.url}`);

        const key = req.url.split("/bundle/")[1];
        const bundle = ModLoader.getBundle(key, true);

        // send bundle
        HttpServer.sendFile(resp, bundle.path);
    }

    static getBundles(url, info, sessionID)
    {
        const local = (HttpConfig.ip === "127.0.0.1" || HttpConfig.ip === "localhost");
        return HttpResponse.noBody(ModLoader.getBundles(local));
    }

    static getBundle(url, info, sessionID)
    {
        return "BUNDLE";
    }
}

module.exports = ModCallbacks;

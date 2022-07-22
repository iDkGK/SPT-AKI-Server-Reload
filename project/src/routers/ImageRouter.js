"use strict";

require("../Lib.js");

class ImageRouter
{
    static onRoute = {};

    static sendImage(sessionID, req, resp, body)
    {
        // remove file extension
        const url = VFS.stripExtension(req.url);

        // send image
        if (ImageRouter.onRoute[url])
        {
            HttpServer.sendFile(resp, ImageRouter.onRoute[url]);
        }
    }

    static getImage(url, info, sessionID)
    {
        return "IMAGE";
    }
}

module.exports = ImageRouter;

"use strict";

require("../Lib.js");

class HttpCallbacks
{
    static load()
    {
        HttpServer.load();
    }

    static sendImage(sessionID, req, resp, body)
    {
        ImageRouter.sendImage(sessionID, req, resp, body);
    }

    static getImage()
    {
        return ImageRouter.getImage();
    }
}

module.exports = HttpCallbacks;

"use strict";

require("../Lib.js");

class ImageRouter
{
    static addRoute(key, valueToAdd)
    {
        ImageRouteService.addRoute(key, valueToAdd);
    }

    static sendImage(sessionID, req, resp, body)
    {
        // remove file extension
        const url = VFS.stripExtension(req.url);

        // send image
        if (ImageRouteService.existsByKey(url))
        {
            HttpServer.sendFile(resp, ImageRouteService.getByKey(url));
        }
    }

    static getImage()
    {
        return "IMAGE";
    }
}

module.exports = ImageRouter;

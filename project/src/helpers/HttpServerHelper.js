"use strict";

require("../Lib.js");

class HttpServerHelper
{
    static get mime()
    {
        return {
            css: "text/css",
            bin: "application/octet-stream",
            html: "text/html",
            jpg: "image/jpeg",
            js: "text/javascript",
            json: "application/json",
            png: "image/png",
            svg: "image/svg+xml",
            txt: "text/plain",
        };
    }

    static getMimeText(key)
    {
        return HttpServerHelper.mime[key];
    }

    static buildUrl()
    {
        return `${HttpConfig.ip}:${HttpConfig.port}`;
    }

    static getBackendUrl()
    {
        return `http://${HttpServerHelper.buildUrl()}`;
    }

    static getWebsocketUrl()
    {
        return `ws://${HttpServerHelper.buildUrl()}`;
    }

    static sendTextJson(resp, output)
    {
        resp.writeHead(200, "OK", {
            "Content-Type": HttpServerHelper.mime["json"],
        });
        resp.end(output);
    }
}

module.exports = HttpServerHelper;

"use strict";

require("../Lib.js");

class NotifierCallbacks
{
    /**
     * If we don't have anything to send, it's ok to not send anything back
     * because notification requests can be long-polling. In fact, we SHOULD wait
     * until we actually have something to send because otherwise we'd spam the client
     * and the client would abort the connection due to spam.
     */
    static sendNotification(sessionID, req, resp, data)
    {
        const splittedUrl = req.url.split("/");
        sessionID = splittedUrl[splittedUrl.length - 1].split("?last_id")[0];

        /**
         * Take our array of JSON message objects and cast them to JSON strings, so that they can then
         *  be sent to client as NEWLINE separated strings... yup.
         */
        NotifierController.notifyAsync(sessionID)
            .then((messages) => messages.map(message => JSON.stringify(message)).join("\n"))
            .then((text) => HttpServer.sendTextJson(resp, text));
    }

    static getNotifier(url, info, sessionID)
    {
        return HttpResponse.emptyArrayResponse();
    }

    static createNotifierChannel(url, info, sessionID)
    {
        return HttpResponse.getBody(NotifierController.getChannel(sessionID));
    }

    static selectProfile(url, info, sessionID)
    {
        return HttpResponse.getBody({
            "status": "ok",
            "notifier": NotifierController.getChannel(sessionID),
            "notifierServer": NotifierController.getServer(sessionID)
        });
    }

    static notify(url, info, sessionID)
    {
        return "NOTIFY";
    }
}

module.exports = NotifierCallbacks;

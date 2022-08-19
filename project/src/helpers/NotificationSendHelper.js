"use strict";

require("../Lib.js");

class NotificationSendHelper
{
    /**
     * Send notification message to the appropiate channel
     */
    static sendMessage(sessionID, notificationMessage)
    {
        if (HttpServer.isConnectionWebSocket(sessionID))
        {
            HttpServer.sendMessage(sessionID, notificationMessage);
        }
        else
        {
            NotificationService.add(sessionID, notificationMessage);
        }
    }
}

module.exports = NotificationSendHelper;

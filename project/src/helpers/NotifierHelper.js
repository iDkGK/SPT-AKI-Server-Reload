"use strict";

require("../Lib.js");

class NotifierHelper
{
    /**
     * The default notification sent when waiting times out.
     */
    static get defaultNotification()
    {
        return {
            type: "ping",
            eventId: "ping",
        };
    }

    static getDefaultNotification()
    {
        return NotifierHelper.defaultNotification;
    }

    /** Creates a new notification that displays the "Your offer was sold!" prompt and removes sold offer from "My Offers" on clientside */
    static createRagfairOfferSoldNotification(dialogueMessage, ragfairData)
    {
        return {
            type: "RagfairOfferSold",
            eventId: dialogueMessage._id,
            dialogId: dialogueMessage.uid,
            ...ragfairData,
        };
    }

    /** Creates a new notification with the specified dialogueMessage object. */
    static createNewMessageNotification(dialogueMessage)
    {
        return {
            type: "new_message",
            eventId: dialogueMessage._id,
            dialogId: dialogueMessage.uid,
            message: dialogueMessage,
        };
    }

    static getWebSocketServer(sessionID)
    {
        return `${HttpServerHelper.getWebsocketUrl()}/notifierServer/getwebsocket/${sessionID}`;
    }
}

module.exports = NotifierHelper;

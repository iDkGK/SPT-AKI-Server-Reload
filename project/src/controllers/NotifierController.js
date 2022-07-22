"use strict";

require("../Lib.js");

class NotifierController
{
    static messageQueue = {};
    static pollInterval = 300;
    static timeout = 15000;

    /**
     * The default notification sent when waiting times out.
     */
    static defaultMessage = {
        "type": "ping",
        "eventId": "ping"
    };

    /**
     * Get message queue for session
     * @param sessionID
     */
    static get(sessionID)
    {
        if (!sessionID)
        {
            throw new Error("sessionID missing");
        }

        if (!NotifierController.messageQueue[sessionID])
        {
            NotifierController.messageQueue[sessionID] = [];
        }

        return NotifierController.messageQueue[sessionID];
    }

    /**
     * Add message to queue
     */
    static add(sessionID, message)
    {
        NotifierController.get(sessionID).push(message);
    }

    static has(sessionID)
    {
        return NotifierController.get(sessionID).length > 0;
    }

    /**
     * Pop first message from queue.
     */
    static pop(sessionID)
    {
        return NotifierController.get(sessionID).shift();
    }

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
            NotifierController.add(sessionID, notificationMessage);
        }
    }

    /**
     * Resolve an array of session notifications.
     *
     * If no notifications are currently queued then intermittently check for new notifications until either
     * one or more appear or when a timeout expires.
     * If no notifications are available after the timeout, use a default message.
     */
    static async notifyAsync(sessionID)
    {
        return new Promise((resolve) =>
        {
            // keep track of our timeout
            let counter = 0;

            /**
             * Check for notifications, resolve if any, otherwise poll
             *  intermittently for a period of time.
             */
            const checkNotifications = () =>
            {
                /**
                 * If there are no pending messages we should either check again later
                 *  or timeout now with a default response.
                 */
                if (!NotifierController.has(sessionID))
                {
                    // have we exceeded timeout? if so reply with default ping message
                    if (counter > NotifierController.timeout)
                    {
                        return resolve([NotifierController.defaultMessage]);
                    }

                    // check again
                    setTimeout(checkNotifications, NotifierController.pollInterval);

                    // update our timeout counter
                    counter += NotifierController.pollInterval;
                    return;
                }

                /**
                 * Maintaining array reference is not necessary, so we can just copy and reinitialize
                 */
                const messages = NotifierController.get(sessionID);

                NotifierController.messageQueue[sessionID] = [];
                resolve(messages);
            };

            // immediately check
            checkNotifications();
        });
    }

    /** Creates a new notification with the specified dialogueMessage object. */
    static createNewMessageNotification(dialogueMessage)
    {
        return {
            "type": "new_message",
            "eventId": dialogueMessage._id,
            "dialogId": dialogueMessage.uid,
            "message": dialogueMessage
        };
    }

    /** Creates a new notification that displays the "Your offer was sold!" prompt and removes sold offer from "My Offers" on clientside */
    static createRagfairOfferSoldNotification(dialogueMessage, ragfairData)
    {
        return {
            "type": "RagfairOfferSold",
            "eventId": dialogueMessage._id,
            "dialogId": dialogueMessage.uid,
            ...ragfairData
        };
    }

    static getServer(sessionID)
    {
        return `${HttpServer.getBackendUrl()}/notifierServer/get/${sessionID}`;
    }

    static getWebSocketServer(sessionID)
    {
        return `${HttpServer.getWebsocketUrl()}/notifierServer/getwebsocket/${sessionID}`;
    }

    static getChannel(sessionID)
    {
        return {
            "server": HttpServer.buildUrl(),
            "channel_id": sessionID,
            "url": NotifierController.getServer(sessionID),
            "notifierServer": NotifierController.getServer(sessionID),
            "ws": NotifierController.getWebSocketServer(sessionID)
        };
    }
}

module.exports = NotifierController;

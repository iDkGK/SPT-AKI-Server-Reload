"use strict";

require("../Lib.js");

class NotificationService
{
    static messageQueue = {};

    static getMessageQueue()
    {
        return NotificationService.messageQueue;
    }

    static getMessageFromQueue(sessionId)
    {
        return NotificationService.messageQueue[sessionId];
    }

    static updateMessageOnQueue(sessionId, value)
    {
        NotificationService.messageQueue[sessionId] = value;
    }

    static has(sessionID)
    {
        return NotificationService.get(sessionID).length > 0;
    }

    /**
     * Pop first message from queue.
     */
    static pop(sessionID)
    {
        return NotificationService.get(sessionID).shift();
    }

    /**
     * Add message to queue
     */
    static add(sessionID, message)
    {
        NotificationService.get(sessionID).push(message);
    }

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

        if (!NotificationService.messageQueue[sessionID])
        {
            NotificationService.messageQueue[sessionID] = [];
        }

        return NotificationService.messageQueue[sessionID];
    }
}

module.exports = NotificationService;
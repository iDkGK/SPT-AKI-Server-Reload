"use strict";

require("../Lib.js");

class NotifierController
{
    static get pollInterval()
    {
        return 300;
    }

    static get timeout()
    {
        return 15000;
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
        return new Promise(resolve =>
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
                if (!NotificationService.has(sessionID))
                {
                    // have we exceeded timeout? if so reply with default ping message
                    if (counter > NotifierController.timeout)
                    {
                        return resolve([
                            NotifierHelper.getDefaultNotification(),
                        ]);
                    }

                    // check again
                    setTimeout(
                        checkNotifications,
                        NotifierController.pollInterval
                    );

                    // update our timeout counter
                    counter += NotifierController.pollInterval;
                    return;
                }

                /**
                 * Maintaining array reference is not necessary, so we can just copy and reinitialize
                 */
                const messages = NotificationService.get(sessionID);

                NotificationService.updateMessageOnQueue(sessionID, []);
                resolve(messages);
            };

            // immediately check
            checkNotifications();
        });
    }

    static getServer(sessionID)
    {
        return `${HttpServerHelper.getBackendUrl()}/notifierServer/get/${sessionID}`;
    }

    static getChannel(sessionID)
    {
        return {
            server: HttpServerHelper.buildUrl(),
            channel_id: sessionID,
            url: NotifierController.getServer(sessionID),
            notifierServer: NotifierController.getServer(sessionID),
            ws: NotifierHelper.getWebSocketServer(sessionID),
        };
    }
}

module.exports = NotifierController;

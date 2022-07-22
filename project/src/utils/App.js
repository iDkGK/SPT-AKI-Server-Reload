"use strict";

require("../Lib.js");

class App
{
    static onLoad = {};
    static onUpdate = {};
    static onUpdateLastRun = {};

    static load()
    {
        // bind callbacks
        App.onLoad = require("../bindings/AppLoad");
        App.onUpdate = require("../bindings/AppUpdate");

        // execute onLoad callbacks
        console.log("Server: executing startup callbacks...");

        for (const callback in App.onLoad)
        {
            App.onLoad[callback]();
        }

        setInterval(App.update, 1000);
    }

    static update()
    {
        for (const taskId in App.onUpdate)
        {
            let success = false;
            const lastRunTimeTimestamp = App.onUpdateLastRun[taskId] || 0; // 0 on first load so all update() calls occur on first load
            const secondsSinceLastRun = TimeUtil.getTimestamp() - lastRunTimeTimestamp;

            try
            {
                success = App.onUpdate[taskId](secondsSinceLastRun);
            }
            catch (err)
            {
                Logger.error(`Scheduled event: '${taskId}' failed to run successfully.`);
                console.log(err);
            }

            if (success)
            {
                App.onUpdateLastRun[taskId] = TimeUtil.getTimestamp();
            }
            else
            {
                /* temporary for debug */
                const warnTime = 20 * 60;

                if (success === void 0 && !(secondsSinceLastRun % warnTime))
                {
                    Logger.debug(`onUpdate: ${taskId} doesn't report success or fail`);
                }
            }
        }
    }
}

module.exports = App;

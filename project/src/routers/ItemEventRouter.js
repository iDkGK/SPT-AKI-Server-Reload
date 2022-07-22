"use strict";

require("../Lib.js");

class ItemEventRouter
{
    static onEvent = require("../bindings/ItemEvents");
    static output = {
        "warnings": [],
        "profileChanges": {}
    };

    static handleEvents(info, sessionID)
    {
        ItemEventRouter.resetOutput(sessionID);
        let result = {};

        for (const body of info.data)
        {
            const pmcData = ProfileController.getPmcProfile(sessionID);

            if (ItemEventRouter.onEvent[body.Action])
            {
                for (const callback in ItemEventRouter.onEvent[body.Action])
                {
                    result = ItemEventRouter.onEvent[body.Action][callback](pmcData, body, sessionID);
                }
            }
            else
            {
                Logger.error(`[UNHANDLED EVENT] ${body.Action}`);
                Logger.writeToLogFile(body);
            }
        }

        return result;
    }

    static getOutput(sessionID)
    {
        if (!ItemEventRouter.output.profileChanges[sessionID])
        {
            ItemEventRouter.resetOutput(sessionID);
        }

        return ItemEventRouter.output;
    }

    static resetOutput(sessionID)
    {
        const pmcData = ProfileController.getPmcProfile(sessionID);

        ItemEventRouter.output.warnings = [];
        ItemEventRouter.output.profileChanges[sessionID] = {
            "_id": sessionID,
            "experience": 0,
            "quests": [],
            "ragFairOffers": [],
            "builds": [],
            "items": {
                "new": [],
                "change": [],
                "del": []
            },
            "production": {},
            "skills": {
                "Common": JsonUtil.clone(pmcData.Skills.Common),
                "Mastering": [],
                "Points": 0
            },
            "traderRelations": {}
        };
    }
}

module.exports = ItemEventRouter;

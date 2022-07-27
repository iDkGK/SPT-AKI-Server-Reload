"use strict";

require("../Lib.js");

class PresetBuildController
{
    static getUserBuilds(sessionID)
    {
        return Object.values(SaveServer.getProfile(sessionID).weaponbuilds);
    }

    static saveBuild(pmcData, body, sessionID)
    {
        delete body.Action;
        body.id = HashUtil.generate();

        const output = ItemEventRouter.getOutput(sessionID);
        const savedBuilds = SaveServer.getProfile(sessionID).weaponbuilds;

        // replace duplicate ID's. The first item is the base item.
        // The root ID and the base item ID need to match.
        body.items = ItemHelper.replaceIDs(pmcData, body.items);
        body.root = body.items[0]._id;

        savedBuilds[body.name] = body;
        SaveServer.getProfile(sessionID).weaponbuilds = savedBuilds;

        output.profileChanges[sessionID].builds.push(body);
        return output;
    }

    static removeBuild(pmcData, body, sessionID)
    {
        const savedBuilds = SaveServer.getProfile(sessionID).weaponbuilds;

        for (const name in savedBuilds)
        {
            if (savedBuilds[name].id === body.id)
            {
                delete savedBuilds[name];
                SaveServer.getProfile(sessionID).weaponbuilds = savedBuilds;
                break;
            }
        }

        return ItemEventRouter.getOutput(sessionID);
    }
}

module.exports = PresetBuildController;

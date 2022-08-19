"use strict";

require("../Lib.js");

class MatchLocationService
{
    static locations = {};

    static createGroup(sessionID, info)
    {
        const groupID = "test";

        MatchLocationService.locations[info.location].groups[groupID] = {
            "_id": groupID,
            "owner": `pmc${sessionID}`,
            "location": info.location,
            "gameVersion": "live",
            "region": "EUR",
            "status": "wait",
            "isSavage": false,
            "timeShift": "CURR",
            "dt": TimeUtil.getTimestamp(),
            "players": [
                {
                    "_id": `pmc${sessionID}`,
                    "region": "EUR",
                    "ip": "127.0.0.1",
                    "savageId": `scav${sessionID}`,
                    "accessKeyId": ""
                }
            ],
            "customDataCenter": []
        };

        return MatchLocationService.locations[info.location].groups[groupID];
    }

    static deleteGroup(info)
    {
        for (const locationID in MatchLocationService.locations)
        {
            for (const groupID in MatchLocationService.locations[locationID].groups)
            {
                if (groupID === info.groupId)
                {
                    delete MatchLocationService.locations[locationID].groups[groupID];
                    return;
                }
            }
        }
    }
}

module.exports = MatchLocationService;
"use strict";

require("../Lib.js");

class MatchController
{
    static locations = {};

    static getEnabled()
    {
        return MatchConfig.enabled;
    }

    static getProfile(info)
    {
        if (info.profileId.includes("pmcAID"))
        {
            return ProfileHelper.getCompleteProfile(
                info.profileId.replace("pmcAID", "AID")
            );
        }

        if (info.profileId.includes("scavAID"))
        {
            return ProfileHelper.getCompleteProfile(
                info.profileId.replace("scavAID", "AID")
            );
        }

        return null;
    }

    static getMatch(location)
    {
        return {
            id: "TEST",
            ip: "127.0.0.1",
            port: 9909,
        };
    }

    static joinMatch(info, sessionID)
    {
        const match = MatchController.getMatch(info.location);
        const output = [];

        // --- LOOP (DO THIS FOR EVERY PLAYER IN GROUP)
        // get player profile
        const account = LauncherController.find(sessionID);
        const profileID = info.savage
            ? `scav${account.id}`
            : `pmc${account.id}`;

        // get list of players joining into the match
        output.push({
            profileid: profileID,
            status: "busy",
            sid: "",
            ip: match.ip,
            port: match.port,
            version: "live",
            location: info.location,
            gamemode: "deathmatch",
            shortid: match.id,
        });

        return output;
    }

    static getGroupStatus(info)
    {
        return {
            players: [],
            invite: [],
            group: [],
        };
    }

    static createGroup(sessionID, info)
    {
        const groupID = "test";

        MatchController.locations[info.location].groups[groupID] = {
            _id: groupID,
            owner: `pmc${sessionID}`,
            location: info.location,
            gameVersion: "live",
            region: "EUR",
            status: "wait",
            isSavage: false,
            timeShift: "CURR",
            dt: TimeUtil.getTimestamp(),
            players: [
                {
                    _id: `pmc${sessionID}`,
                    region: "EUR",
                    ip: "127.0.0.1",
                    savageId: `scav${sessionID}`,
                    accessKeyId: "",
                },
            ],
            customDataCenter: [],
        };

        return MatchController.locations[info.location].groups[groupID];
    }

    static deleteGroup(info)
    {
        for (const locationID in MatchController.locations)
        {
            for (const groupID in MatchController.locations[locationID]
                .groups)
            {
                if (groupID === info.groupId)
                {
                    delete MatchController.locations[locationID].groups[
                        groupID
                    ];
                    return;
                }
            }
        }
    }

    static startOfflineRaid(info, sessionID)
    {
        //TODO:
    }

    static endOfflineRaid(info, sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const extract = info.exitName;

        if (!InraidConfig.carExtracts.includes(extract))
        {
            return;
        }

        if (!(extract in pmcData.CarExtractCounts))
        {
            pmcData.CarExtractCounts[extract] = 0;
        }

        pmcData.CarExtractCounts[extract] += 1;
        const extractCount = pmcData.CarExtractCounts[extract];

        const fenceID = TraderHelper.TRADER.Fence;
        let fenceStanding = Number(pmcData.TradersInfo[fenceID].standing);

        // Not exact replica of Live behaviour
        // Simplified for now, no real reason to do the whole (unconfirmed) extra 0.01 standing per day regeneration mechanic
        const baseGain = InraidConfig.carExtractBaseStandingGain;
        fenceStanding += Math.max(baseGain / extractCount, 0.01);

        pmcData.TradersInfo[fenceID].standing = Math.min(
            Math.max(fenceStanding, -7),
            6
        );
        TraderHelper.lvlUp(fenceID, sessionID);
        pmcData.TradersInfo[fenceID].loyaltyLevel = Math.max(
            pmcData.TradersInfo[fenceID].loyaltyLevel,
            1
        );
    }
}

module.exports = MatchController;

"use strict";

require("../Lib.js");

class MatchController
{
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

    static createGroup(sessionID, info)
    {
        return MatchLocationService.createGroup(sessionID, info);
    }

    static deleteGroup(info)
    {
        MatchLocationService.deleteGroup(info);
    }

    static joinMatch(info, sessionID)
    {
        const match = MatchController.getMatch(info.location);
        const output = [];

        // --- LOOP (DO THIS FOR EVERY PLAYER IN GROUP)
        // get player profile
        const account = SaveServer.getProfile(sessionID).info;
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

    static getMatch(location)
    {
        return {
            id: "TEST",
            ip: "127.0.0.1",
            port: 9909,
        };
    }

    static getGroupStatus(info)
    {
        return {
            players: [],
            invite: [],
            group: [],
        };
    }

    static startOfflineRaid(info, sessionID)
    {
        //TODO: add code to strip PMC of equipment now they've started the raid

        // Store the profile as-is for later use on the post-raid exp screen
        const currentProfile = SaveServer.getProfile(sessionID);
        ProfileSnapshotService.storeProfileSnapshot(sessionID, currentProfile);
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

        const fenceID = Traders.FENCE;
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

        // clear bot loot cache
        BotLootCacheService.clearCache();
    }
}

module.exports = MatchController;

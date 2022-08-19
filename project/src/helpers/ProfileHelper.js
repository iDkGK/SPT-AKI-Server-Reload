"use strict";

require("../Lib.js");

class ProfileHelper
{
    static resetProfileQuestCondition(sessionID, conditionId)
    {
        const startedQuests = ProfileHelper.getPmcProfile(
            sessionID
        ).Quests.filter(q => q.status === QuestStatus.Started);

        for (const quest of startedQuests)
        {
            const index = quest.completedConditions.indexOf(conditionId);

            if (index > -1)
            {
                quest.completedConditions.splice(index, 1);
            }
        }
    }

    static getCompleteProfile(sessionID)
    {
        const output = [];

        if (ProfileHelper.isWiped(sessionID))
        {
            return output;
        }

        const pmcProfile = ProfileHelper.getPmcProfile(sessionID);
        const scavProfile = ProfileHelper.getScavProfile(sessionID);

        if (ProfileSnapshotService.hasProfileSnapshot(sessionID))
        {
            return ProfileHelper.postRaidXpWorkaroundFix(
                sessionID,
                output,
                pmcProfile,
                scavProfile
            );
        }

        output.push(pmcProfile);
        output.push(scavProfile);

        return output;
    }

    /**
     * Fix xp doubling on post-raid xp reward screen by sending a 'dummy' profile to the post-raid screen
     * Server saves the post-raid changes prior to the xp screen getting the profile, this results in the xp screen using
     * the now updated profile values as a base, meaning it shows x2 xp gained
     * Instead, clone the post-raid profile (so we dont alter its values), apply the pre-raid xp values to the cloned objects and return
     * Delete snapshot of pre-raid profile prior to returning profile data
     * @param sessionId Session id
     * @param output pmc and scav profiles array
     * @param pmcProfile post-raid pmc profile
     * @param scavProfile post-raid scav profile
     * @returns updated profile array
     */
    static postRaidXpWorkaroundFix(sessionId, output, pmcProfile, scavProfile)
    {
        const clonedPmc = JsonUtil.clone(pmcProfile);
        const clonedScav = JsonUtil.clone(scavProfile);

        const profileSnapshot =
            ProfileSnapshotService.getProfileSnapshot(sessionId);
        clonedPmc.Info.Level = profileSnapshot.characters.pmc.Info.Level;
        clonedPmc.Info.Experience =
            profileSnapshot.characters.pmc.Info.Experience;

        clonedScav.Info.Level = profileSnapshot.characters.scav.Info.Level;
        clonedScav.Info.Experience =
            profileSnapshot.characters.scav.Info.Experience;

        ProfileSnapshotService.clearProfileSnapshot(sessionId);

        output.push(clonedPmc);
        output.push(clonedScav);

        return output;
    }

    static isNicknameTaken(info, sessionID)
    {
        for (const id in SaveServer.getProfiles())
        {
            const profile = SaveServer.getProfile(id);

            if (
                !("characters" in profile) ||
                !("pmc" in profile.characters) ||
                !("Info" in profile.characters.pmc)
            )
            {
                continue;
            }

            if (
                profile.info.id !== sessionID &&
                profile.characters.pmc.Info.LowerNickname ===
                    info.nickname.toLowerCase()
            )
            {
                return true;
            }
        }

        return false;
    }

    /**
     * Add experience to a PMC inside the players profile
     * @param sessionID Session id
     * @param experienceToAdd Experiecne to add to PMC character
     */
    static addExperienceToPmc(sessionID, experienceToAdd)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        pmcData.Info.Experience += experienceToAdd;
    }

    static getProfileByPmcId(pmcId)
    {
        for (const sessionID in SaveServer.getProfiles())
        {
            const profile = SaveServer.getProfile(sessionID);
            if (profile.characters.pmc._id === pmcId)
            {
                return profile.characters.pmc;
            }
        }

        return undefined;
    }

    static getExperience(level)
    {
        const expTable =
            DatabaseServer.getTables().globals.config.exp.level.exp_table;
        let exp = 0;

        if (level >= expTable.length)
        {
            // make sure to not go out of bounds
            level = expTable.length - 1;
        }

        for (let i = 0; i < level; i++)
        {
            exp += expTable[i].exp;
        }

        return exp;
    }

    static getMaxLevel()
    {
        return (
            DatabaseServer.getTables().globals.config.exp.level.exp_table
                .length - 1
        );
    }

    static getDefaultAkiDataObject()
    {
        return {
            version: ProfileHelper.getServerVersion(),
        };
    }

    static getFullProfile(sessionID)
    {
        if (SaveServer.getProfile(sessionID) === undefined)
        {
            return undefined;
        }

        return SaveServer.getProfile(sessionID);
    }

    static getPmcProfile(sessionID)
    {
        const fullProfile = ProfileHelper.getFullProfile(sessionID);
        if (
            fullProfile === undefined ||
            fullProfile.characters.pmc === undefined
        )
        {
            return undefined;
        }

        return SaveServer.getProfile(sessionID).characters.pmc;
    }

    static getScavProfile(sessionID)
    {
        return SaveServer.getProfile(sessionID).characters.scav;
    }

    static getDefaultCounters()
    {
        return {
            CarriedQuestItems: [],
            Victims: [],
            TotalSessionExperience: 0,
            LastSessionDate: TimeUtil.getTimestamp(),
            SessionCounters: { Items: [] },
            OverallCounters: { Items: [] },
            TotalInGameTime: 0,
        };
    }

    static isWiped(sessionID)
    {
        return SaveServer.getProfile(sessionID).info.wipe;
    }

    static getServerVersion()
    {
        return Watermark.getVersionTag(true);
    }

    /**
     * Iterate over player profile inventory items and find the secure container and remove it
     * @param profile Profile to remove secure container from
     * @returns profile without secure container
     */
    static removeSecureContainer(profile)
    {
        const items = profile.Inventory.items;
        for (const item of items)
        {
            if (item.slotId === "SecuredContainer")
            {
                const toRemove = ItemHelper.findAndReturnChildrenByItems(
                    items,
                    item._id
                );
                let n = items.length;

                while (n-- > 0)
                {
                    if (toRemove.includes(items[n]._id))
                    {
                        items.splice(n, 1);
                    }
                }
                break;
            }
        }

        profile.Inventory.items = items;

        return profile;
    }
}

module.exports = ProfileHelper;

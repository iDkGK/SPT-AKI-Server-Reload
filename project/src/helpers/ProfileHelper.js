"use strict";

require("../Lib.js");

class ProfileHelper
{
    static getCompleteProfile(sessionID)
    {
        const output = [];
        if (!LauncherController.isWiped(sessionID))
        {
            output.push(ProfileHelper.getPmcProfile(sessionID));
            output.push(ProfileHelper.getScavProfile(sessionID));
        }
        return output;
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

    static setScavProfile(sessionID, scavData)
    {
        SaveServer.getProfile(sessionID).characters.scav = scavData;
    }

    static getScavSkills(sessionID)
    {
        const profile = SaveServer.getProfile(sessionID);
        if (profile.characters.scav.Skills)
        {
            return profile.characters.scav.Skills;
        }
        return ProfileHelper.getDefaultScavSkills();
    }

    static generatePlayerScav(sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const settings = {
            conditions: [
                {
                    Role: "assault",
                    Limit: 1,
                    Difficulty: "normal"
                }
            ]
        };
        // Horible forced cast as we're going from IBotBase to IPmcData
        let scavData = BotController.generate(settings, true)[0];
        // add proper metadata
        scavData._id = pmcData.savage;
        scavData.aid = sessionID;
        scavData.Info.Settings = {};
        scavData.TradersInfo = JsonUtil.clone(pmcData.TradersInfo);
        scavData.Skills = ProfileHelper.getScavSkills(sessionID);
        scavData.Stats = ProfileHelper.getScavStats(sessionID);
        scavData.Info.Level = ProfileHelper.getScavLevel(sessionID);
        scavData.Info.Experience = ProfileHelper.getScavExperience(sessionID);
        // remove secure container
        scavData = InventoryHelper.removeSecureContainer(scavData);
        // set cooldown timer
        scavData = ProfileHelper.setScavCooldownTimer(scavData, pmcData);
        // add scav to the profile
        ProfileHelper.setScavProfile(sessionID, scavData);
        return scavData;
    }

    static getDefaultScavSkills()
    {
        return {
            Common: [],
            Mastering: [],
            Bonuses: undefined,
            Points: 0,
        };
    }

    static getScavStats(sessionID)
    {
        const profile = SaveServer.getProfile(sessionID);
        if (profile && profile.characters.scav.Stats)
        {
            return profile.characters.scav.Stats;
        }
        return ProfileHelper.getDefaultCounters();
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

    static getServerVersion()
    {
        return Watermark.getVersionTag();
    }

    static getScavLevel(sessionID)
    {
        const profile = SaveServer.getProfile(sessionID);
        // Info can be null on initial account creation
        if (
            !profile.characters.scav.Info ||
            !profile.characters.scav.Info.Level
        )
        {
            return 1;
        }
        return profile.characters.scav.Info.Level;
    }

    static getScavExperience(sessionID)
    {
        const profile = SaveServer.getProfile(sessionID);
        // Info can be null on initial account creation
        if (
            !profile.characters.scav.Info ||
            !profile.characters.scav.Info.Experience
        )
        {
            return 0;
        }
        return profile.characters.scav.Info.Experience;
    }

    static setScavCooldownTimer(profile, pmcData)
    {
        // Set cooldown time.
        // Make sure to apply ScavCooldownTimer bonus from Hideout if the player has it.
        let scavLockDuration =
            DatabaseServer.tables.globals.config.SavagePlayCooldown;
        let modifier = 1;
        for (const bonus of pmcData.Bonuses)
        {
            if (bonus.type === "ScavCooldownTimer")
            {
                // Value is negative, so add.
                // Also note that for scav cooldown, multiple bonuses stack additively.
                modifier += bonus.value / 100;
            }
        }
        const fenceInfo = FenceService.getFenceInfo(pmcData);
        modifier *= fenceInfo.SavageCooldownModifier;
        scavLockDuration *= modifier;
        profile.Info.SavageLockTime = Date.now() / 1000 + scavLockDuration;
        return profile;
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
            DatabaseServer.tables.globals.config.exp.level.exp_table;
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
            DatabaseServer.tables.globals.config.exp.level.exp_table.length - 1
        );
    }

    static getMiniProfile(sessionID)
    {
        const maxlvl = ProfileHelper.getMaxLevel();
        const profile = SaveServer.getProfile(sessionID);
        const pmc = profile.characters.pmc;
        // make sure character completed creation
        if (!("Info" in pmc) || !("Level" in pmc.Info))
        {
            return {
                username: profile.info.username,
                nickname: "unknown",
                side: "unknown",
                currlvl: 0,
                currexp: 0,
                prevexp: 0,
                nextlvl: 0,
                maxlvl: maxlvl,
                akiData: ProfileHelper.getDefaultAkiDataObject(),
            };
        }
        const currlvl = pmc.Info.Level;
        const nextlvl = ProfileHelper.getExperience(currlvl + 1);
        const result = {
            username: profile.info.username,
            nickname: pmc.Info.Nickname,
            side: pmc.Info.Side,
            currlvl: pmc.Info.Level,
            currexp: pmc.Info.Experience,
            prevexp: currlvl === 0 ? 0 : ProfileHelper.getExperience(currlvl),
            nextlvl: nextlvl,
            maxlvl: maxlvl,
            akiData: profile.aki,
        };
        return result;
    }

    static getDefaultAkiDataObject()
    {
        return {
            version: ProfileHelper.getServerVersion(),
        };
    }
}

module.exports = ProfileHelper;

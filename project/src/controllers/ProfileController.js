"use strict";

const { pmc } = require("../configs/BotConfig.js");
const Watermark = require("../utils/Watermark.js");

require("../Lib.js");

class ProfileController
{
    static sessionId = "";

    static onLoad(sessionID)
    {
        const profile = SaveServer.profiles[sessionID];

        if (!("characters" in profile))
        {
            profile.characters = {
                "pmc": {},
                "scav": {}
            };
        }

        return profile;
    }

    static getFullProfile(sessionID)
    {
        if (SaveServer.profiles[sessionID] === undefined)
        {
            return undefined;
        }

        return SaveServer.profiles[sessionID];
    }

    static getPmcProfile(sessionID)
    {
        const fullProfile = ProfileController.getFullProfile(sessionID);
        if (fullProfile === undefined || fullProfile.characters.pmc === undefined)
        {
            return undefined;
        }

        return SaveServer.profiles[sessionID].characters.pmc;
    }

    static getScavProfile(sessionID)
    {
        return SaveServer.profiles[sessionID].characters.scav;
    }

    static setScavProfile(sessionID, scavData)
    {
        SaveServer.profiles[sessionID].characters.scav = scavData;
    }

    static getCompleteProfile(sessionID)
    {
        const output = [];

        if (!LauncherController.isWiped(sessionID))
        {
            output.push(ProfileController.getPmcProfile(sessionID));
            output.push(ProfileController.getScavProfile(sessionID));
        }

        return output;
    }

    static createProfile(info, sessionID)
    {
        const account = LauncherController.find(sessionID);
        const profile = DatabaseServer.tables.templates.profiles[account.edition][info.side.toLowerCase()];
        const pmcData = profile.character;

        // delete existing profile
        if (sessionID in SaveServer.profiles)
        {
            delete SaveServer.profiles[sessionID];
        }

        // pmc
        pmcData._id = `pmc${sessionID}`;
        pmcData.aid = sessionID;
        pmcData.savage = `scav${sessionID}`;
        pmcData.Info.Nickname = info.nickname;
        pmcData.Info.LowerNickname = info.nickname.toLowerCase();
        pmcData.Info.RegistrationDate = TimeUtil.getTimestamp();
        pmcData.Info.Voice = DatabaseServer.tables.templates.customization[info.voiceId]._name;
        pmcData.Stats = ProfileController.getDefaultCounters();
        pmcData.Customization.Head = info.headId;
        pmcData.Health.UpdateTime = TimeUtil.getTimestamp();
        pmcData.Quests = [];
        pmcData.RepeatableQuests = [];
        pmcData.CarExtractCounts = {};

        // change item id's to be unique
        pmcData.Inventory.items = ItemHelper.replaceIDs(pmcData, pmcData.Inventory.items, null, pmcData.Inventory.fastPanel);

        // create profile
        SaveServer.profiles[sessionID] = {
            "info": account,
            "characters": {
                "pmc": pmcData,
                "scav": {}
            },
            "suits": profile.suits,
            "weaponbuilds": profile.weaponbuilds,
            "dialogues": profile.dialogues,
            "aki": ProfileController.getDefaultAkiDataObject()
        };

        // pmc profile needs to exist first
        SaveServer.profiles[sessionID].characters.scav = ProfileController.generatePlayerScav(sessionID);

        for (const traderID in DatabaseServer.tables.traders)
        {
            ProfileController.resetTrader(sessionID, traderID);
        }

        // store minimal profile and reload it
        SaveServer.saveProfile(sessionID);
        SaveServer.loadProfile(sessionID);

        // completed account creation
        SaveServer.profiles[sessionID].info.wipe = false;
        SaveServer.saveProfile(sessionID);
    }

    static resetTrader(sessionID, traderID)
    {
        const account = LauncherController.find(sessionID);
        const pmcData = ProfileController.getPmcProfile(sessionID);
        const traderWipe = DatabaseServer.tables.templates.profiles[account.edition][pmcData.Info.Side.toLowerCase()].trader;

        pmcData.TradersInfo[traderID] = {
            "loyaltyLevel": 1,
            "salesSum": traderWipe.initialSalesSum,
            "standing": traderWipe.initialStanding,
            "nextResupply": DatabaseServer.tables.traders[traderID].base.nextResupply,
            "unlocked": DatabaseServer.tables.traders[traderID].base.unlockedByDefault
        };
    }

    static generatePlayerScav(sessionID)
    {
        const pmcData = ProfileController.getPmcProfile(sessionID);
        let scavData = BotController.generate({
            "conditions": [
                {
                    "Role": "assault",
                    "Limit": 1,
                    "Difficulty": "normal"
                }
            ]
        }, true)[0];

        // add proper metadata
        scavData._id = pmcData.savage;
        scavData.aid = sessionID;
        scavData.Info.Settings = {};
        scavData.TradersInfo = JsonUtil.clone(pmcData.TradersInfo);
        scavData.Skills = ProfileController.getScavSkills(sessionID);
        scavData.Stats = ProfileController.getScavStats(sessionID);
        scavData.Info.Level = ProfileController.getScavLevel(sessionID);
        scavData.Info.Experience = ProfileController.getScavExperience(sessionID);

        // remove secure container
        scavData = InventoryHelper.removeSecureContainer(scavData);

        // set cooldown timer
        scavData = ProfileController.setScavCooldownTimer(scavData, pmcData);

        // add scav to the profile
        ProfileController.setScavProfile(sessionID, scavData);
        return scavData;
    }

    static getScavSkills(sessionID)
    {
        if (SaveServer.profiles[sessionID].characters.scav.Skills)
        {
            return SaveServer.profiles[sessionID].characters.scav.Skills;
        }

        return ProfileController.getDefaultScavSkills();
    }

    static getDefaultScavSkills()
    {
        return {
            "Common": [],
            "Mastering": [],
            "Points": 0
        };
    }

    static getScavStats(sessionID)
    {
        if (SaveServer.profiles[sessionID] && SaveServer.profiles[sessionID].characters.scav.Stats)
        {
            return SaveServer.profiles[sessionID].characters.scav.Stats;
        }

        return ProfileController.getDefaultCounters();
    }

    static getDefaultCounters()
    {
        return {
            "SessionCounters": {
                "Items": []
            },
            "OverallCounters": {
                "Items": []
            }
        };
    }

    static getServerVersion()
    {
        return Watermark.getVersionTag();
    }

    static getScavLevel(sessionID)
    {
        // Info can be null on initial account creation
        if (!SaveServer.profiles[sessionID].characters.scav.Info || !SaveServer.profiles[sessionID].characters.scav.Info.Level)
        {
            return 1;
        }

        return SaveServer.profiles[sessionID].characters.scav.Info.Level;
    }

    static getScavExperience(sessionID)
    {
        // Info can be null on initial account creation
        if (!SaveServer.profiles[sessionID].characters.scav.Info || !SaveServer.profiles[sessionID].characters.scav.Info.Experience)
        {
            return 0;
        }

        return SaveServer.profiles[sessionID].characters.scav.Info.Experience;
    }

    static setScavCooldownTimer(profile, pmcData)
    {
        // Set cooldown time.
        // Make sure to apply ScavCooldownTimer bonus from Hideout if the player has it.
        let scavLockDuration = DatabaseServer.tables.globals.config.SavagePlayCooldown;
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

        const fenceInfo = TraderController.getFenceInfo(pmcData);
        modifier *= fenceInfo.SavageCooldownModifier;

        scavLockDuration *= modifier;
        profile.Info.SavageLockTime = (Date.now() / 1000) + scavLockDuration;
        return profile;
    }

    static isNicknameTaken(info, sessionID)
    {
        for (const id in SaveServer.profiles)
        {
            const profile = SaveServer.profiles[id];

            if (!("characters" in profile) || !("pmc" in profile.characters) || !("Info" in profile.characters.pmc))
            {
                continue;
            }

            if (profile.info.id !== sessionID && profile.characters.pmc.Info.LowerNickname === info.nickname.toLowerCase())
            {
                return true;
            }
        }

        return false;
    }

    static validateNickname(info, sessionID)
    {
        if (info.nickname.length < 3)
        {
            return "tooshort";
        }

        if (ProfileController.isNicknameTaken(info, sessionID))
        {
            return "taken";
        }

        return "OK";
    }

    static changeNickname(info, sessionID)
    {
        const output = ProfileController.validateNickname(info, sessionID);

        if (output === "OK")
        {
            const pmcData = ProfileController.getPmcProfile(sessionID);

            pmcData.Info.Nickname = info.nickname;
            pmcData.Info.LowerNickname = info.nickname.toLowerCase();
        }

        return output;
    }

    static changeVoice(info, sessionID)
    {
        const pmcData = ProfileController.getPmcProfile(sessionID);
        pmcData.Info.Voice = info.voice;
    }

    static getProfileByPmcId(pmcId)
    {
        for (const sessionID in SaveServer.profiles)
        {
            if (SaveServer.profiles[sessionID].characters.pmc._id === pmcId)
            {
                return SaveServer.profiles[sessionID].characters.pmc;
            }
        }

        return undefined;
    }

    static getExperience(level)
    {
        const expTable = DatabaseServer.tables.globals.config.exp.level.exp_table;
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
        return DatabaseServer.tables.globals.config.exp.level.exp_table.length - 1;
    }

    static getMiniProfile(sessionID)
    {
        const maxlvl = ProfileController.getMaxLevel();
        const profile = SaveServer.profiles[sessionID];
        const pmc = profile.characters.pmc;

        // make sure character completed creation
        if (!("Info" in pmc) || !("Level" in pmc.Info))
        {
            return {
                "username": profile.info.username,
                "nickname": "unknown",
                "side": "unknown",
                "currlvl": 0,
                "currexp": 0,
                "prevexp": 0,
                "nextlvl": 0,
                "maxlvl": maxlvl,
                "akiData": ProfileController.getDefaultAkiDataObject()
            };
        }

        const currlvl = pmc.Info.Level;
        const nextlvl = ProfileController.getExperience(currlvl + 1);
        const result = {
            "username": profile.info.username,
            "nickname": pmc.Info.Nickname,
            "side": pmc.Info.Side,
            "currlvl": pmc.Info.Level,
            "currexp": pmc.Info.Experience,
            "prevexp": (currlvl === 0) ? 0 : ProfileController.getExperience(currlvl),
            "nextlvl": nextlvl,
            "maxlvl": maxlvl,
            "akiData": profile.aki
        };

        return result;
    }

    static getDefaultAkiDataObject()
    {
        return {
            "version": ProfileController.getServerVersion()
        };
    }
}

module.exports = ProfileController;

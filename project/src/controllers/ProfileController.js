"use strict";

require("../Lib.js");

class ProfileController
{
    static sessionId = "";

    static onLoad(sessionID)
    {
        const profile = SaveServer.getProfile(sessionID);

        if (profile.characters === null)
        {
            profile.characters = {
                pmc: {},
                scav: {},
            };
        }

        return profile;
    }

    static getCompleteProfile(sessionID)
    {
        return ProfileHelper.getCompleteProfile(sessionID);
    }

    static createProfile(info, sessionID)
    {
        const account = LauncherController.find(sessionID);
        const profile =
            DatabaseServer.tables.templates.profiles[account.edition][
                info.side.toLowerCase()
            ];
        const pmcData = profile.character;

        // delete existing profile
        if (sessionID in SaveServer.getProfiles())
        {
            SaveServer.deleteProfileById(sessionID);
        }

        // pmc
        pmcData._id = `pmc${sessionID}`;
        pmcData.aid = sessionID;
        pmcData.savage = `scav${sessionID}`;
        pmcData.Info.Nickname = info.nickname;
        pmcData.Info.LowerNickname = info.nickname.toLowerCase();
        pmcData.Info.RegistrationDate = TimeUtil.getTimestamp();
        pmcData.Info.Voice =
            DatabaseServer.tables.templates.customization[info.voiceId]._name;
        pmcData.Stats = ProfileHelper.getDefaultCounters();
        pmcData.Customization.Head = info.headId;
        pmcData.Health.UpdateTime = TimeUtil.getTimestamp();
        pmcData.Quests = [];
        pmcData.RepeatableQuests = [];
        pmcData.CarExtractCounts = {};

        // change item id's to be unique
        pmcData.Inventory.items = ItemHelper.replaceIDs(
            pmcData,
            pmcData.Inventory.items,
            null,
            pmcData.Inventory.fastPanel
        );

        // create profile
        const profileDetails = {
            info: account,
            characters: {
                pmc: pmcData,
                scav: {},
            },
            suits: profile.suits,
            weaponbuilds: profile.weaponbuilds,
            dialogues: profile.dialogues,
            aki: ProfileHelper.getDefaultAkiDataObject(),
        };
        SaveServer.addProfile(profileDetails);

        // pmc profile needs to exist first
        SaveServer.getProfile(sessionID).characters.scav =
            ProfileController.generatePlayerScav(sessionID);

        for (const traderID in DatabaseServer.tables.traders)
        {
            TraderHelper.resetTrader(sessionID, traderID);
        }

        // store minimal profile and reload it
        SaveServer.saveProfile(sessionID);
        SaveServer.loadProfile(sessionID);

        // completed account creation
        SaveServer.getProfile(sessionID).info.wipe = false;
        SaveServer.saveProfile(sessionID);
    }

    static generatePlayerScav(sessionID)
    {
        return ProfileHelper.generatePlayerScav(sessionID);
    }

    static validateNickname(info, sessionID)
    {
        if (info.nickname.length < 3)
        {
            return "tooshort";
        }

        if (ProfileHelper.isNicknameTaken(info, sessionID))
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
            const pmcData = ProfileHelper.getPmcProfile(sessionID);

            pmcData.Info.Nickname = info.nickname;
            pmcData.Info.LowerNickname = info.nickname.toLowerCase();
        }

        return output;
    }

    static changeVoice(info, sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        pmcData.Info.Voice = info.voice;
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

    static getFriends(info, sessionID)
    {
        return [
            {
                _id: HashUtil.generate(),
                Info: {
                    Level: 1,
                    Side: "Bear",
                    Nickname: info.nickname,
                },
            },
        ];
    }
}

module.exports = ProfileController;

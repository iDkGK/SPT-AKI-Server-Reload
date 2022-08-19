"use strict";

require("../Lib.js");

class ProfileController
{
    static getMiniProfiles()
    {
        const miniProfiles = [];

        for (const sessionIdKey in SaveServer.getProfiles())
        {
            miniProfiles.push(ProfileController.getMiniProfile(sessionIdKey));
        }

        return miniProfiles;
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

    static getCompleteProfile(sessionID)
    {
        return ProfileHelper.getCompleteProfile(sessionID);
    }

    static createProfile(info, sessionID)
    {
        const account = SaveServer.getProfile(sessionID).info;
        const profile =
            DatabaseServer.getTables().templates.profiles[account.edition][
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
            DatabaseServer.getTables().templates.customization[
                info.voiceId
            ]._name;
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
            vitality: {},
            inraid: {},
            insurance: [],
        };

        ProfileFixerService.checkForAndFixPmcProfileIssues(
            profileDetails.characters.pmc
        );

        SaveServer.addProfile(profileDetails);

        SaveServer.getProfile(sessionID).characters.scav =
            ProfileController.generatePlayerScav(sessionID);

        for (const traderID in DatabaseServer.getTables().traders)
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

    /**
     * Generate a player scav object
     * pmc profile MUST exist first before pscav can be generated
     * @param sessionID
     * @returns IPmcData object
     */
    static generatePlayerScav(sessionID)
    {
        return PlayerScavGenerator.generate(sessionID);
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

"use strict";

require("../Lib.js");

class GameController
{
    static gameStart(_url, _info, sessionID)
    {
        // repeatableQuests are stored by in profile.Quests due to the responses of the client (e.g. Quests in offraidData)
        // Since we don't want to clutter the Quests list, we need to remove all completed (failed / successful) repeatable quests.
        // We also have to remove the Counters from the repeatableQuests
        if (sessionID)
        {
            const fullProfile = ProfileHelper.getFullProfile(sessionID);
            const pmcProfile = fullProfile.characters.pmc;

            ProfileFixerService.checkForAndFixPmcProfileIssues(pmcProfile);

            ProfileFixerService.addMissingAkiVersionTagToProfile(fullProfile);

            GameController.logProfileDetails(fullProfile);
        }
    }

    static logProfileDetails(fullProfile)
    {
        Logger.debug(`Profile made with: ${fullProfile.aki.version}`);
        Logger.debug(`Server version: ${CoreConfig.akiVersion}`);
        Logger.debug(`Debug enabled: ${globalThis.G_DEBUG_CONFIGURATION}`);
        Logger.debug(`Mods enabled: ${globalThis.G_MODS_ENABLED}`);
    }

    static getGameConfig(sessionID)
    {
        const config = {
            languages: {
                ch: "Chinese",
                cz: "Czech",
                en: "English",
                fr: "French",
                ge: "German",
                hu: "Hungarian",
                it: "Italian",
                jp: "Japanese",
                kr: "Korean",
                pl: "Polish",
                po: "Portugal",
                sk: "Slovak",
                es: "Spanish",
                "es-mx": "Spanish Mexico",
                tu: "Turkish",
                ru: "Русский",
            },
            ndaFree: false,
            reportAvailable: false,
            twitchEventMember: false,
            lang: LocaleService.getDesiredLocale(),
            aid: sessionID,
            taxonomy: 341,
            activeProfileId: `pmc${sessionID}`,
            backend: {
                Trading: HttpServerHelper.getBackendUrl(),
                Messaging: HttpServerHelper.getBackendUrl(),
                Main: HttpServerHelper.getBackendUrl(),
                RagFair: HttpServerHelper.getBackendUrl(),
            },
            utc_time: new Date().getTime() / 1000,
            totalInGame: 1,
        };

        return config;
    }

    static getServer()
    {
        return [
            {
                ip: HttpConfig.ip,
                port: HttpConfig.port,
            },
        ];
    }

    static getValidGameVersion()
    {
        return {
            isvalid: true,
            latestVersion: CoreConfig.compatibleTarkovVersion,
        };
    }
}

module.exports = GameController;

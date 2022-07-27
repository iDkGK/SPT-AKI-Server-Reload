"use strict";

require("../Lib.js");

class GameController
{
    static gameStart(url, info, sessionID)
    {
        // repeatableQuests are stored by in profile.Quests due to the responses of the client (e.g. Quests in offraidData)
        // Since we don't want to clutter the Quests list, we need to remove all completed (failed / successful) repeatable quests.
        // We also have to remove the Counters from the repeatableQuests
        if (sessionID)
        {
            const fullProfile = ProfileHelper.getFullProfile(sessionID);
            const pmcProfile = fullProfile.characters.pmc;

            // If the profile grows in quests in case the client does not handle cleanup uncomment this:
            // // find all quest id which are in profile.Quests but not in database.template.Quests
            // let nonStoryQuests = profile.Quests.filter(q => !Object.keys(DatabaseServer.tables.templates.quests).includes(q.qid));
            // // find of those quests these, which are Succeeded or Failed (the other ones are still active)
            // nonStoryQuests = nonStoryQuests.filter(q => q.status === "Success" | q.status === "Fail");
            // const nonStoryQuestIds = Array.from(nonStoryQuests, q => q.qid);
            // // only keep those whose id is not found in nonStoryQuestIds
            // profile.Quests = profile.Quests.filter(q => !nonStoryQuestIds.includes(q.qid));

            // remove dangling ConditionCounters
            if (pmcProfile.ConditionCounters)
            {
                pmcProfile.ConditionCounters.Counters =
                    pmcProfile.ConditionCounters.Counters.filter(
                        c => c.qid !== null
                    );
            }

            // make sure new we have the changeRequirements attributes (new Repeatable Quest structure)
            if (pmcProfile.RepeatableQuests)
            {
                let repeatablesCompatible = true;
                for (const currentRepeatable of pmcProfile.RepeatableQuests)
                {
                    if (
                        !currentRepeatable.changeRequirement ||
                        !currentRepeatable.activeQuests.every(
                            x =>
                                typeof x.changeCost !== "undefined" &&
                                typeof x.changeStandingCost !== "undefined"
                        )
                    )
                    {
                        repeatablesCompatible = false;
                        break;
                    }
                }

                if (!repeatablesCompatible)
                {
                    pmcProfile.RepeatableQuests = [];
                }
            }

            if (pmcProfile.Hideout)
            {
                if (typeof pmcProfile["Bonuses"] === "undefined")
                {
                    pmcProfile["Bonuses"] = [];
                }
                const lavatory = pmcProfile.Hideout.Areas.find(x => x.type === HideoutAreasEnum.LAVATORY);
                if (lavatory)
                {
                    if (lavatory.level > 0)
                    {
                        const bonus = pmcProfile.Bonuses.find(x => x.type === "UnlockArmorRepair");
                        if (!bonus)
                        {
                            pmcProfile.Bonuses.push(
                                {
                                    type: "UnlockArmorRepair",
                                    value: 1,
                                    passive: true,
                                    production: false,
                                    visible: true
                                }
                            );
                        }
                    }
                }
                const workbench = pmcProfile.Hideout.Areas.find(x => x.type === HideoutAreasEnum.WORKBENCH);
                if (workbench)
                {
                    if (workbench.level > 0)
                    {
                        const bonus = pmcProfile.Bonuses.find(x => x.type === "UnlockWeaponRepair");
                        if (!bonus)
                        {
                            pmcProfile.Bonuses.push(
                                {
                                    type: "UnlockWeaponRepair",
                                    value: 1,
                                    passive: true,
                                    production: false,
                                    visible: true
                                }
                            );
                        }
                    }
                }
            }

            // remove dangling BackendCounters
            if (pmcProfile.BackendCounters)
            {
                const countersToRemove = [];
                const activeQuests = GameController.getActiveRepeatableQuests(
                    pmcProfile.RepeatableQuests
                );

                for (const [key, backendCounter] of Object.entries(
                    pmcProfile.BackendCounters
                ))
                {
                    if (
                        pmcProfile.RepeatableQuests &&
                        activeQuests.length > 0
                    )
                    {
                        const matchingQuest = activeQuests.filter(
                            x => x._id === backendCounter.qid
                        );
                        const quest = pmcProfile.Quests.filter(
                            q => q.qid === backendCounter.qid
                        );

                        // if BackendCounter's quest is neither in activeQuests nor Quests it's stale
                        if (matchingQuest.length === 0 && quest.length === 0)
                        {
                            countersToRemove.push(key);
                        }
                    }
                }

                for (let i = 0; i < countersToRemove.length; i++)
                {
                    delete pmcProfile.BackendCounters[countersToRemove[i]];
                }
            }

            if (!fullProfile.aki)
            {
                fullProfile.aki = {
                    version: Watermark.getVersionTag(),
                };
            }

            Logger.debug(`Profile made with: ${fullProfile.aki.version}`);
        }
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
                ru: "Русский"
            },
            ndaFree: false,
            reportAvailable: false,
            twitchEventMember: false,
            lang: "en",
            aid: sessionID,
            taxonomy: 341,
            activeProfileId: `pmc${sessionID}`,
            backend: {
                Trading: HttpServer.getBackendUrl(),
                Messaging: HttpServer.getBackendUrl(),
                Main: HttpServer.getBackendUrl(),
                RagFair: HttpServer.getBackendUrl()
            },
            utc_time: new Date().getTime() / 1000,
            totalInGame: 1
        };
        return config;
    }

    static getActiveRepeatableQuests(repeatableQuests)
    {
        let activeQuests = [];
        repeatableQuests.forEach(x =>
        {
            if (x.activeQuests.length > 0)
            {
                // daily/weekly collection has active quests in them, add to array and return
                activeQuests = activeQuests.concat(x.activeQuests);
            }
        });

        return activeQuests;
    }
}

module.exports = GameController;

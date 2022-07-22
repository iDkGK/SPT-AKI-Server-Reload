"use strict";

const Watermark = require("../utils/Watermark.js");

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
            const fullProfile = ProfileController.getFullProfile(sessionID);
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
                pmcProfile.ConditionCounters.Counters = pmcProfile.ConditionCounters.Counters.filter(c => c.qid !== null);
            }

            // remove dangling BackendCounters
            if (pmcProfile.BackendCounters)
            {
                const countersToRemove = [];
                for (const [key, value] of Object.entries(pmcProfile.BackendCounters))
                {
                    if (pmcProfile.RepeatableQuests && pmcProfile.RepeatableQuests.activeQuests)
                    {
                        const repeatable = pmcProfile.RepeatableQuests.activeQuests.filter(q => q._id === value.qid);
                        const quest = pmcProfile.Quests.filter(q => q.qid === value.qid);
                        // if BackendCounter's quest is neither in activeQuests nor Quests it's stale
                        if (repeatable.length === 0 && quest.length === 0)
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
                    "version": Watermark.getVersionTag()
                };
            }

            Logger.debug(`Profile made with: ${fullProfile.aki.version}`);
        }
    }
}

module.exports = GameController;
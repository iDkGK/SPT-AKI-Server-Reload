"use strict";

require("../Lib.js");

class QuestHelper
{
    /* changing these will require a wipe */
    static status = {
        "Locked": 0,
        "AvailableForStart": 1,
        "Started": 2,
        "AvailableForFinish": 3,
        "Success": 4,
        "Fail": 5,
        "FailRestartable": 6,
        "MarkedAsFailed": 7
    };

    static filterConditions(q, questType, furtherFilter = null)
    {
        const filteredQuests = q.filter(c =>
        {
            if (c._parent === questType)
            {
                if (furtherFilter)
                {
                    return furtherFilter(c);
                }
                return true;
            }
            return false;
        });

        return filteredQuests;
    }

    static getQuestConditions(q, furtherFilter = null)
    {
        return QuestHelper.filterConditions(q, "Quest", furtherFilter);
    }

    static getLevelConditions(q, furtherFilter = null)
    {
        return QuestHelper.filterConditions(q, "Level", furtherFilter);
    }

    static getLoyaltyConditions(q, furtherFilter = null)
    {
        return QuestHelper.filterConditions(q, "TraderLoyalty", furtherFilter);
    }

    /**
     * returns true is the condition is satisfied
     */
    static evaluateLevel(pmcProfile, cond)
    {
        const level = pmcProfile.Info.Level;
        if (cond._parent === "Level")
        {
            switch (cond._props.compareMethod)
            {
                case ">=":
                    return level >= cond._props.value;
                default:
                    Logger.debug(`Unrecognised Comparison Method: ${cond._props.compareMethod}`);
                    return false;
            }
        }
    }

    /* debug functions */
    static getQuestLocale(questId)
    {
        return DatabaseServer.tables.locales.global["en"].quest[questId];
    }

    static getDeltaQuests(before, after)
    {
        const knownQuestsIds = [];

        for (const q of before)
        {
            knownQuestsIds.push(q._id);
        }

        if (knownQuestsIds.length)
        {
            return after.filter((q) =>
            {
                return knownQuestsIds.indexOf(q._id) === -1;
            });
        }
        return after;
    }

    static rewardSkillPoints(sessionID, pmcData, output, skillName, progress)
    {
        const index = pmcData.Skills.Common.findIndex(s => s.Id === skillName);

        if (index === -1)
        {
            Logger.error(`Skill ${skillName} not found!`);
            return;
        }

        const profileSkill = pmcData.Skills.Common[index];
        const clientSkill = output.profileChanges[sessionID].skills.Common[index];

        profileSkill.Progress += parseInt(progress);
        profileSkill.LastAccess = TimeUtil.getTimestamp();
        clientSkill.Progress = profileSkill.Progress;
        clientSkill.LastAccess = profileSkill.LastAccess;
    }

    /**
     * Debug Routine for showing some information on the
     * quest list in question.
     */
    static dumpQuests(quests, label = null)
    {
        for (const quest of quests)
        {
            const currentQuestLocale = QuestHelper.getQuestLocale(quest._id);

            Logger.debug(`${currentQuestLocale.name} (${quest._id})`);

            for (const cond of quest.conditions.AvailableForStart)
            {
                let output = `- ${cond._parent} `;

                if (cond._parent === "Quest")
                {
                    if (cond._props.target !== void 0)
                    {
                        const locale = QuestHelper.getQuestLocale(cond._props.target);

                        if (locale)
                        {
                            output += `linked to: ${locale.name} `;
                        }

                        output += `(${cond._props.target}) with status: `;
                    }

                }
                else
                {
                    output += `${cond._props.compareMethod} ${cond._props.value}`;
                }

                Logger.debug(output);
            }

            Logger.debug("AvailableForFinish info:");

            for (const cond of quest.conditions.AvailableForFinish)
            {
                let output = `- ${cond._parent} `;

                switch (cond._parent)
                {
                    case "FindItem":
                    case "CounterCreator":
                        if (cond._props.target !== void 0)
                        {
                            const taskDescription = currentQuestLocale.conditions[cond._props.id];
                            if (taskDescription)
                            {
                                output += `: ${taskDescription} `;
                            }
                            else
                            {
                                output += `Description not found: ${cond._props.id}`;
                            }
                            output += `(${cond._props.target}) with status: `;
                        }
                        break;

                    case "HandoverItem":
                    case "PlaceBeacon":
                        break;

                    default:
                        output += `${cond._props.compareMethod} ${cond._props.value}`;
                        console.log(cond);
                        break;
                }

                Logger.debug(output);
            }

            Logger.debug("-- end\n");
        }
    }
}

module.exports = QuestHelper;
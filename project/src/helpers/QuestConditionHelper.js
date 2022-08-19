"use strict";

require("../Lib.js");

class QuestConditionHelper
{
    static getQuestConditions(q, furtherFilter = null)
    {
        return QuestConditionHelper.filterConditions(q, "Quest", furtherFilter);
    }

    static getLevelConditions(q, furtherFilter = null)
    {
        return QuestConditionHelper.filterConditions(q, "Level", furtherFilter);
    }

    static getLoyaltyConditions(q, furtherFilter = null)
    {
        return QuestConditionHelper.filterConditions(
            q,
            "TraderLoyalty",
            furtherFilter
        );
    }

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
}

module.exports = QuestConditionHelper;
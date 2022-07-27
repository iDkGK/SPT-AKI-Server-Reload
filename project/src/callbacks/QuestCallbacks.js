"use strict";

require("../Lib.js");

class QuestCallbacks
{
    static changeRepeatableQuest(pmcData, body, sessionID)
    {
        return RepeatableQuestController.changeRepeatableQuest(
            pmcData,
            body,
            sessionID
        );
    }

    static acceptQuest(pmcData, body, sessionID)
    {
        if (body.type === "repeatable")
        {
            return QuestController.acceptRepeatableQuest(
                pmcData,
                body,
                sessionID
            );
        }

        return QuestController.acceptQuest(pmcData, body, sessionID);
    }

    static completeQuest(pmcData, body, sessionID)
    {
        return QuestController.completeQuest(pmcData, body, sessionID);
    }

    static handoverQuest(pmcData, body, sessionID)
    {
        return QuestController.handoverQuest(pmcData, body, sessionID);
    }

    static listQuests(url, info, sessionID)
    {
        return HttpResponse.getBody(QuestController.getClientQuests(sessionID));
    }

    static activityPeriods(url, info, sessionID)
    {
        return HttpResponse.getBody(
            RepeatableQuestController.getClientRepeatableQuests(info, sessionID)
        );
    }
}

module.exports = QuestCallbacks;

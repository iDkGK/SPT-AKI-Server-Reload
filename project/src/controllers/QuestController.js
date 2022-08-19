"use strict";

require("../Lib.js");

class QuestController
{
    /**
     * Get all quests visible to player
     * Exclude quests with incomplete preconditions (level/loyalty)
     * @param sessionID session id
     * @returns array of IQuest
     */
    static getClientQuests(sessionID)
    {
        const quests = [];
        const allQuests = QuestHelper.questValues();
        const profile = ProfileHelper.getPmcProfile(sessionID);

        for (const quest of allQuests)
        {
            // If a quest is already in the profile we need to just add it
            if (profile.Quests.some(x => x.qid === quest._id))
            {
                quests.push(quest);
                continue;
            }

            // Don't add quests that have a level higher than the user's
            const levels = QuestConditionHelper.getLevelConditions(
                quest.conditions.AvailableForStart
            );
            if (levels.length)
            {
                if (!QuestHelper.evaluateLevel(profile, levels[0]))
                {
                    continue;
                }
            }

            const questRequirements = QuestConditionHelper.getQuestConditions(
                quest.conditions.AvailableForStart
            );
            const loyaltyRequirements =
                QuestConditionHelper.getLoyaltyConditions(
                    quest.conditions.AvailableForStart
                );

            // If the quest has no quest/loyalty conditions then add to visible quest list
            if (
                questRequirements.length === 0 &&
                loyaltyRequirements.length === 0
            )
            {
                quests.push(quest);
                continue;
            }

            // Check the status of each quest condition, if any are not completed
            // then this quest should not be visible
            let haveCompletedPreviousQuest = true;
            for (const condition of questRequirements)
            {
                const previousQuest = profile.Quests.find(
                    pq => pq.qid === condition._props.target
                );

                // If the previous quest isn't in the user profile, it hasn't been completed or started
                if (!previousQuest)
                {
                    haveCompletedPreviousQuest = false;
                    break;
                }

                // If previous is in user profile, check condition requirement and current status
                if (condition._props.status.includes(previousQuest.status))
                {
                    continue;
                }

                // Chemical fix: "Started" Status is catered for above. This will include it just if it's started.
                // but maybe this is better:
                // if ((condition._props.status[0] === QuestStatus.Started)
                // && (previousQuest.status === "AvailableForFinish" || previousQuest.status ===  "Success")
                if (condition._props.status[0] === QuestStatus.Started)
                {
                    const statusName =
                        Object.keys(QuestStatus)[condition._props.status[0]];
                    Logger.debug(
                        `[QUESTS]: fix for polikhim bug: ${quest._id} (${
                            QuestHelper.getQuestLocale(quest._id).name
                        }) ${condition._props.status[0]}, ${statusName} != ${
                            previousQuest.status
                        }`
                    );
                    continue;
                }
                haveCompletedPreviousQuest = false;
                break;
            }

            let passesLoyaltyRequirements = true;
            for (const condition of loyaltyRequirements)
            {
                const result = QuestHelper.loyaltyRequirementCheck(
                    condition._props,
                    profile
                );
                if (!result)
                {
                    passesLoyaltyRequirements = false;
                    break;
                }
            }

            if (haveCompletedPreviousQuest && passesLoyaltyRequirements)
            {
                quests.push(QuestHelper.cleanQuestConditions(quest));
            }
        }
        return quests;
    }

    static acceptQuest(pmcData, acceptedQuest, sessionID)
    {
        const state = QuestStatus.Started;
        QuestHelper.addQuestToPMCData(pmcData, state, acceptedQuest);

        // Create a dialog message for starting the quest.
        // Note that for starting quests, the correct locale field is "description", not "startedMessageText".
        const quest = QuestHelper.getQuestFromDb(acceptedQuest.qid, pmcData);
        let startedMessageId = QuestHelper.getQuestLocaleIdFromDb(
            quest.startedMessageText
        );
        const questRewards = QuestHelper.getQuestRewardItems(quest, state);

        // blank or is a guid, use description instead (its always a guid...)
        if (startedMessageId === "" || startedMessageId.length === 24)
        {
            startedMessageId = QuestHelper.getQuestLocaleIdFromDb(
                quest.description
            );
        }
        const messageContent = DialogueHelper.createMessageContext(
            startedMessageId,
            MessageType.QUEST_START,
            QuestConfig.redeemTime
        );
        DialogueHelper.addDialogueMessage(
            quest.traderId,
            messageContent,
            sessionID,
            questRewards
        );

        const acceptQuestResponse = ItemEventRouter.getOutput(sessionID);
        acceptQuestResponse.profileChanges[sessionID].quests =
            QuestHelper.acceptedUnlocked(acceptedQuest.qid, sessionID);

        return acceptQuestResponse;
    }

    static acceptRepeatableQuest(pmcData, acceptedQuest, sessionID)
    {
        const state = QuestStatus.Started;
        QuestHelper.addQuestToPMCData(pmcData, state, acceptedQuest);

        let repeatableQuestDb;
        for (const repeatable of pmcData.RepeatableQuests)
        {
            repeatableQuestDb = repeatable.activeQuests.find(
                x => x._id === acceptedQuest.qid
            );
            if (repeatableQuestDb)
            {
                Logger.debug(
                    `Accepted repeatable quest ${acceptedQuest.qid} from ${repeatable.name}`
                );
                break;
            }
        }

        if (!repeatableQuestDb)
        {
            Logger.error(
                `Accepted a repeatable quest ${acceptedQuest.qid} which could not be found in the activeQuests array. Please report bug.`
            );
            throw new Error("Unable to accept quest, see log for error");
        }

        const locale =
            DatabaseServer.getTables().locales.global[
                LocaleService.getDesiredLocale()
            ];
        let questStartedMessageKey =
            locale.repeatableQuest[repeatableQuestDb.startedMessageText];
        let questStartedMessageText = locale.mail[questStartedMessageKey];

        if (!questStartedMessageText)
        {
            Logger.debug(
                `Unable to accept quest ${acceptedQuest.qid}, cannot find the quest started message text with id ${questStartedMessageKey}. attempting to find it in en locale instead`
            );

            // For some reason non-en locales dont have repeatable quest ids, fall back to en and grab it if possible
            const enLocale = DatabaseServer.getTables().locales.global["en"];
            questStartedMessageKey =
                enLocale.repeatableQuest[repeatableQuestDb.startedMessageText];
            questStartedMessageText = locale.mail[questStartedMessageKey];

            if (!questStartedMessageText)
            {
                Logger.error(
                    `Unable to accept quest ${acceptedQuest.qid}, cannot find the quest started message text with id ${questStartedMessageKey}`
                );
                throw new Error("Unable to accept quest, see log for error");
            }
        }

        // if value is blank or a guid
        if (
            questStartedMessageText.trim() === "" ||
            questStartedMessageText.length === 24
        )
        {
            questStartedMessageKey =
                locale.repeatableQuest[repeatableQuestDb.description];
        }

        const questRewards = QuestHelper.getQuestRewardItems(
            repeatableQuestDb,
            state
        );
        const messageContent = DialogueHelper.createMessageContext(
            questStartedMessageKey,
            MessageType.QUEST_START,
            QuestConfig.redeemTime
        );

        DialogueHelper.addDialogueMessage(
            repeatableQuestDb.traderId,
            messageContent,
            sessionID,
            questRewards
        );

        const acceptQuestResponse = ItemEventRouter.getOutput(sessionID);
        acceptQuestResponse.profileChanges[sessionID].quests =
            QuestHelper.acceptedUnlocked(acceptedQuest.qid, sessionID);
        return acceptQuestResponse;
    }

    /**
     * Remove completed quest from profile
     * Add newly unlocked quests to profile
     * Also recalculate thier level due to exp rewards
     * @param pmcData Player profile
     * @param body completed quest request
     * @param sessionID session id
     * @returns ItemEvent response
     */
    static completeQuest(pmcData, body, sessionID)
    {
        const completedQuestId = body.qid;
        const beforeQuests = QuestController.getClientQuests(sessionID); // Must be gathered prior to applyQuestReward() & failQuests()

        const newQuestState = QuestStatus.Success;
        QuestHelper.updateQuestState(pmcData, newQuestState, completedQuestId);
        const questRewards = QuestHelper.applyQuestReward(
            pmcData,
            body,
            newQuestState,
            sessionID
        );

        // Check if any of linked quest is failed, and that is unrestartable.
        const questsToFail =
            QuestController.getQuestsFailedByCompletingQuest(completedQuestId);
        if (questsToFail && questsToFail.length > 0)
        {
            QuestController.failQuests(sessionID, pmcData, questsToFail);
        }

        QuestController.sendDialogMessageOnQuestComplete(
            sessionID,
            pmcData,
            completedQuestId,
            questRewards
        );

        const completeQuestResponse = ItemEventRouter.getOutput(sessionID);
        completeQuestResponse.profileChanges[sessionID].quests =
            QuestHelper.getDeltaQuests(
                beforeQuests,
                QuestController.getClientQuests(sessionID)
            );

        // Update trader info data on response
        Object.assign(
            completeQuestResponse.profileChanges[sessionID].traderRelations,
            pmcData.TradersInfo
        );

        // Check if it's a repeatable quest. If so remove from Quests and repeatable.activeQuests list to repeatable.inactiveQuests
        for (const currentRepeatable of pmcData.RepeatableQuests)
        {
            const repeatableQuest = currentRepeatable.activeQuests.find(
                x => x._id === completedQuestId
            );
            if (repeatableQuest)
            {
                currentRepeatable.activeQuests =
                    currentRepeatable.activeQuests.filter(
                        x => x._id !== completedQuestId
                    );
                currentRepeatable.inactiveQuests.push(repeatableQuest);
            }
        }

        // Recalculate level in event player leveled up
        pmcData.Info.Level = PlayerService.calculateLevel(pmcData);

        return completeQuestResponse;
    }

    /**
     * Send a popup to player on completion of a quest
     * @param sessionID session id
     * @param pmcData player profile
     * @param completedQuestId completed quest id
     * @param questRewards rewards given to player
     */
    static sendDialogMessageOnQuestComplete(
        sessionID,
        pmcData,
        completedQuestId,
        questRewards
    )
    {
        const quest = QuestHelper.getQuestFromDb(completedQuestId, pmcData);
        const successMessageId = QuestHelper.getQuestLocaleIdFromDb(
            quest.successMessageText
        );
        const messageContent = DialogueHelper.createMessageContext(
            successMessageId,
            MessageType.QUEST_SUCCESS,
            QuestConfig.redeemTime
        );

        DialogueHelper.addDialogueMessage(
            quest.traderId,
            messageContent,
            sessionID,
            questRewards
        );
    }

    /**
     * Returns a list of quests that should be failed when a quest is completed
     * @param completedQuestId quest completed id
     * @returns array of quests
     */
    static getQuestsFailedByCompletingQuest(completedQuestId)
    {
        return QuestHelper.questValues().filter(x =>
        {
            // No fail conditions, exit early
            if (!x.conditions.Fail || x.conditions.Fail.length === 0)
            {
                return false;
            }

            for (const failCondition of x.conditions.Fail)
            {
                if (failCondition._props.target === completedQuestId)
                {
                    return true;
                }
            }

            return false;
        });
    }

    /**
     * Fail the quests provided
     * @param sessionID session id
     * @param pmcData player profile
     * @param questsToFail quests to fail
     */
    static failQuests(sessionID, pmcData, questsToFail)
    {
        for (const questToFail of questsToFail)
        {
            if (
                questToFail.conditions.Fail[0]._props.status[0] !==
                QuestStatus.Success
            )
            {
                continue;
            }

            const isActiveQuestInPlayerProfile = pmcData.Quests.find(
                y => y.qid === questToFail._id
            );
            if (isActiveQuestInPlayerProfile)
            {
                const failBody = {
                    Action: "QuestComplete",
                    qid: questToFail._id,
                    removeExcessItems: true,
                };
                QuestHelper.failQuest(pmcData, failBody, sessionID);
            }
            else
            {
                const questData = {
                    qid: questToFail._id,
                    startTime: TimeUtil.getTimestamp(),
                    status: QuestStatus.Fail,
                };
                pmcData.Quests.push(questData);
            }
        }
    }

    static handoverQuest(pmcData, body, sessionID)
    {
        const quest = QuestHelper.getQuestFromDb(body.qid, pmcData);
        const types = ["HandoverItem", "WeaponAssembly"];
        const output = ItemEventRouter.getOutput(sessionID);
        let handoverMode = true;
        let value = 0;
        let counter = 0;
        let amount;

        for (const condition of quest.conditions.AvailableForFinish)
        {
            if (
                condition._props.id === body.conditionId &&
                types.includes(condition._parent)
            )
            {
                value = condition._props.value;
                handoverMode = condition._parent === types[0];

                const profileCounter =
                    body.conditionId in pmcData.BackendCounters
                        ? pmcData.BackendCounters[body.conditionId].value
                        : 0;
                value -= profileCounter;

                if (value <= 0)
                {
                    Logger.error(
                        `Quest handover error: condition is already satisfied? qid=${body.qid}, condition=${body.conditionId}, profileCounter=${profileCounter}, value=${value}`
                    );
                    return output;
                }

                break;
            }
        }

        if (handoverMode && value === 0)
        {
            Logger.error(
                `Quest handover error: condition not found or incorrect value. qid=${body.qid}, condition=${body.conditionId}`
            );
            return output;
        }

        for (const itemHandover of body.items)
        {
            // remove the right quantity of given items
            amount = Math.min(itemHandover.count, value - counter);
            counter += amount;
            if (itemHandover.count - amount > 0)
            {
                QuestHelper.changeItemStack(
                    pmcData,
                    itemHandover.id,
                    itemHandover.count - amount,
                    sessionID,
                    output
                );
                if (counter === value)
                {
                    break;
                }
            }
            else
            {
                // for weapon handover quests, remove the item and its children.
                const toRemove = ItemHelper.findAndReturnChildrenByItems(
                    pmcData.Inventory.items,
                    itemHandover.id
                );
                let index = pmcData.Inventory.items.length;

                // important: don't tell the client to remove the attachments, it will handle it
                output.profileChanges[sessionID].items.del.push({
                    _id: itemHandover.id,
                });

                // important: loop backward when removing items from the array we're looping on
                while (index-- > 0)
                {
                    if (toRemove.includes(pmcData.Inventory.items[index]._id))
                    {
                        pmcData.Inventory.items.splice(index, 1);
                    }
                }
            }
        }

        if (pmcData.BackendCounters[body.conditionId] !== undefined)
        {
            pmcData.BackendCounters[body.conditionId].value += counter;
        }
        else
        {
            pmcData.BackendCounters[body.conditionId] = {
                id: body.conditionId,
                qid: body.qid,
                value: counter,
            };
        }

        return output;
    }
}

module.exports = QuestController;

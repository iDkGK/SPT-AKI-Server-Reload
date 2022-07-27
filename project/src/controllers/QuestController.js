"use strict";

require("../Lib.js");

class QuestController
{
    static getClientQuests(sessionID)
    {
        const quests = [];
        const allQuests = QuestController.questValues();
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
            const levels = QuestHelper.getLevelConditions(
                quest.conditions.AvailableForStart
            );

            if (levels.length)
            {
                if (!QuestHelper.evaluateLevel(profile, levels[0]))
                {
                    continue;
                }
            }

            const questRequirements = QuestHelper.getQuestConditions(
                quest.conditions.AvailableForStart
            );
            const loyaltyRequirements = QuestHelper.getLoyaltyConditions(
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
                if (
                    previousQuest.status ===
                    Object.keys(QuestHelper.STATUS)[condition._props.status[0]]
                )
                {
                    continue;
                }

                // Chemical fix: "Started" Status is catered for above. This will include it just if it's started.
                // but maybe this is better:
                // if ((condition._props.status[0] === QuestHelper.status.Started)
                // && (previousQuest.status === "AvailableForFinish" || previousQuest.status ===  "Success")
                if (condition._props.status[0] === QuestHelper.STATUS.Started)
                {
                    const statusName = Object.keys(QuestHelper.STATUS)[
                        condition._props.status[0]
                    ];
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
                const result = QuestController.loyaltyRequirementCheck(
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
                quests.push(QuestController.cleanQuestConditions(quest));
            }
        }
        return quests;
    }

    static loyaltyRequirementCheck(loyaltyRequirementProperties, profile)
    {
        const requiredLoyaltyStanding = Number(
            loyaltyRequirementProperties.value
        );
        const operator = loyaltyRequirementProperties.compareMethod;
        const currentTraderStanding =
            profile.TradersInfo[loyaltyRequirementProperties.target]
                .loyaltyLevel;

        if (operator === ">=")
        {
            return currentTraderStanding >= requiredLoyaltyStanding;
        }

        if (operator === ">")
        {
            return currentTraderStanding > requiredLoyaltyStanding;
        }

        if (operator === "<=")
        {
            return currentTraderStanding <= requiredLoyaltyStanding;
        }

        if (operator === "<")
        {
            return currentTraderStanding < requiredLoyaltyStanding;
        }

        if (operator === "!=")
        {
            return currentTraderStanding !== requiredLoyaltyStanding;
        }

        if (operator === "==")
        {
            return currentTraderStanding === requiredLoyaltyStanding;
        }
    }

    static getFindItemIdForQuestItem(itemTpl)
    {
        for (const quest of QuestController.questValues())
        {
            const conditions = quest.conditions.AvailableForFinish.filter(c =>
            {
                return c._parent === "FindItem";
            });

            for (const condition of conditions)
            {
                if (condition._props.target.includes(itemTpl))
                {
                    return condition._props.id;
                }
            }
        }
    }

    static processReward(reward)
    {
        let rewardItems = [];
        let targets = [];
        const mods = [];

        let itemCount = 1;

        for (const item of reward.items)
        {
            // reward items are granted Found in Raid
            if (!item.upd)
            {
                item.upd = {};
            }

            item.upd.SpawnedInSession = true;

            // separate base item and mods, fix stacks
            if (item._id === reward.target)
            {
                if (
                    item.parentId !== undefined &&
                    item.parentId === "hideout" &&
                    item.upd !== undefined &&
                    item.upd.StackObjectsCount !== undefined &&
                    item.upd.StackObjectsCount > 1
                )
                {
                    itemCount = item.upd.StackObjectsCount;
                    item.upd.StackObjectsCount = 1;
                }
                targets = ItemHelper.splitStack(item);
                // splitStack created new ids for the new stacks. This would destroy the relation to possible children.
                // Instead, we reset the id to preserve relations and generate a new id in the downstream loop, where we are also reparenting if required
                for (const target of targets)
                {
                    target._id = item._id;
                }
            }
            else
            {
                mods.push(item);
            }
        }

        // add mods to the base items, fix ids
        for (const target of targets)
        {
            // this has all the original id relations since we reset the id to the original after the splitStack
            const items = [JsonUtil.clone(target)];
            // here we generate a new id for the root item
            target._id = HashUtil.generate();

            for (const mod of mods)
            {
                items.push(JsonUtil.clone(mod));
            }

            // reparentPresets generates new unique ids for the children while preserving hierarchy
            rewardItems = rewardItems.concat(
                RagfairServer.reparentPresets(target, items)
            );
        }

        return rewardItems;
    }

    /* Gets a flat list of reward items for the given quest and state
     * input: quest, a quest object
     * input: state, the quest status that holds the items (Started, Success, Fail)
     * output: an array of items with the correct maxStack
     */
    static getQuestRewardItems(quest, state)
    {
        let questRewards = [];

        for (const reward of quest.rewards[state])
        {
            if ("Item" === reward.type)
            {
                questRewards = questRewards.concat(
                    QuestController.processReward(reward)
                );
            }
        }

        return questRewards;
    }

    static applyQuestReward(pmcData, body, state, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        let intelCenterBonus = 0; // percentage of money reward

        // find if player has money reward boost
        const area = pmcData.Hideout.Areas.find(area => area.type === 11);
        if (area)
        {
            if (area.level === 1)
            {
                intelCenterBonus = 5;
            }

            if (area.level > 1)
            {
                intelCenterBonus = 15;
            }
        }

        const pmcQuest = pmcData.Quests.find(quest => quest.qid === body.qid);
        if (pmcQuest)
        {
            pmcQuest.status = state;
        }

        // give reward
        let quest = QuestController.getQuestFromDb(body.qid, pmcData);

        if (intelCenterBonus > 0)
        {
            quest = QuestController.applyMoneyBoost(quest, intelCenterBonus); // money = money + (money * intelCenterBonus / 100)
        }

        for (const reward of quest.rewards[state])
        {
            switch (reward.type)
            {
                case "Skill":
                    QuestHelper.rewardSkillPoints(
                        sessionID,
                        pmcData,
                        output,
                        reward.target,
                        reward.value
                    );
                    break;

                case "Experience":
                    pmcData = ProfileHelper.getPmcProfile(sessionID);
                    pmcData.Info.Experience += parseInt(reward.value);
                    output.profileChanges[sessionID].experience =
                        pmcData.Info.Experience;
                    break;

                case "TraderStanding":
                    pmcData = ProfileHelper.getPmcProfile(sessionID);
                    pmcData.TradersInfo[reward.target].standing += parseFloat(
                        reward.value
                    );

                    if (pmcData.TradersInfo[reward.target].standing < 0)
                    {
                        pmcData.TradersInfo[reward.target].standing = 0;
                    }

                    TraderHelper.lvlUp(reward.target, sessionID);
                    break;

                case "TraderUnlock":
                    TraderHelper.changeTraderDisplay(
                        reward.target,
                        true,
                        sessionID
                    );
                    break;
            }
        }

        return QuestController.getQuestRewardItems(quest, state);
    }

    static acceptQuest(pmcData, acceptedQuest, sessionID)
    {
        const state = "Started";
        const existingQuest = pmcData.Quests.find(
            q => q.qid === acceptedQuest.qid
        );
        QuestController.addQuestToPMCData(
            pmcData,
            existingQuest,
            state,
            acceptedQuest
        );

        // Create a dialog message for starting the quest.
        // Note that for starting quests, the correct locale field is "description", not "startedMessageText".
        const quest = QuestController.getQuestFromDb(
            acceptedQuest.qid,
            pmcData
        );
        let startedMessageId = QuestController.getQuestLocaleIdFromDb(
            quest.startedMessageText
        );
        const questRewards = QuestController.getQuestRewardItems(quest, state);

        // blank or is a guid, use description instead (its always a guid...)
        if (startedMessageId === "" || startedMessageId.length === 24)
        {
            startedMessageId = QuestController.getQuestLocaleIdFromDb(
                quest.description
            );
        }

        const messageContent = DialogueHelper.createMessageContext(
            startedMessageId,
            DialogueHelper.getMessageTypeValue("questStart"),
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
            QuestController.acceptedUnlocked(acceptedQuest.qid, sessionID);
        return acceptQuestResponse;
    }

    static acceptRepeatableQuest(pmcData, acceptedQuest, sessionID)
    {
        const state = "Started";
        const quest = pmcData.Quests.find(q => q.qid === acceptedQuest.qid);
        QuestController.addQuestToPMCData(pmcData, quest, state, acceptedQuest);

        let repeatableQuestDb = null;
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
                `Accepted a repeatable quest ${acceptedQuest.qid} which could not be found in the activeQuests. Please report bug.`
            );
            throw new Error("So sad...");
        }

        const locale = DatabaseServer.tables.locales.global["en"];
        let questStartedMessageKey =
            locale.repeatableQuest[repeatableQuestDb.startedMessageText];
        const questStartedMessageText = locale.mail[questStartedMessageKey];

        // if value is blank or a guid
        if (
            questStartedMessageText.trim() === "" ||
            questStartedMessageText.length === 24
        )
        {
            questStartedMessageKey =
                locale.repeatableQuest[repeatableQuestDb.description];
        }

        const questRewards = QuestController.getQuestRewardItems(
            repeatableQuestDb,
            state
        );
        const messageContent = DialogueHelper.createMessageContext(
            questStartedMessageKey,
            DialogueHelper.getMessageTypeValue("questStart"),
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
            QuestController.acceptedUnlocked(acceptedQuest.qid, sessionID);
        return acceptQuestResponse;
    }

    static addQuestToPMCData(pmcData, quest, newState, acceptedQuest)
    {
        if (quest)
        {
            // If the quest already exists, update its status
            quest.startTime = TimeUtil.getTimestamp();
            quest.status = newState;
        }
        else
        {
            // If the quest doesn't exists, add it
            const newQuest = {
                qid: acceptedQuest.qid,
                startTime: TimeUtil.getTimestamp(),
                status: newState,
                completedConditions: [],
            };

            pmcData.Quests.push(newQuest);
        }
    }

    static completeQuest(pmcData, body, sessionID)
    {
        const beforeQuests = QuestController.getClientQuests(sessionID);
        const questRewards = QuestController.applyQuestReward(
            pmcData,
            body,
            "Success",
            sessionID
        );

        //Check if any of linked quest is failed, and that is unrestartable.
        const checkQuest = QuestController.questValues().filter(q =>
        {
            return (
                q.conditions.Fail.length > 0 &&
                q.conditions.Fail[0]._props.target === body.qid
            );
        });

        for (const checkFail of checkQuest)
        {
            if (
                checkFail.conditions.Fail[0]._props.status[0] ===
                QuestHelper.STATUS.Success
            )
            {
                const checkQuestId = pmcData.Quests.find(
                    qq => qq.qid === checkFail._id
                );

                if (checkQuestId)
                {
                    const failBody = {
                        Action: "QuestComplete",
                        qid: checkFail._id,
                        removeExcessItems: true,
                    };
                    QuestController.failQuest(pmcData, failBody, sessionID);
                }
                else
                {
                    const questData = {
                        qid: checkFail._id,
                        startTime: TimeUtil.getTimestamp(),
                        status: "Fail",
                    };
                    pmcData.Quests.push(questData);
                }
            }
        }

        // Create a dialog message for completing the quest.
        const quest = QuestController.getQuestFromDb(body.qid, pmcData);
        const successMessageId = QuestController.getQuestLocaleIdFromDb(
            quest.successMessageText
        );
        const messageContent = DialogueHelper.createMessageContext(
            successMessageId,
            DialogueHelper.getMessageTypeValue("questSuccess"),
            QuestConfig.redeemTime
        );

        DialogueHelper.addDialogueMessage(
            quest.traderId,
            messageContent,
            sessionID,
            questRewards
        );

        const completeQuestResponse = ItemEventRouter.getOutput(sessionID);
        completeQuestResponse.profileChanges[sessionID].quests =
            QuestHelper.getDeltaQuests(
                beforeQuests,
                QuestController.getClientQuests(sessionID)
            );
        Object.assign(
            completeQuestResponse.profileChanges[sessionID].traderRelations,
            pmcData.TradersInfo
        );

        // check if it's a repeatable quest. If so remove from Quests and repeatable.activeQuests list to repeatable.inactiveQuests
        for (const currentRepeatable of pmcData.RepeatableQuests)
        {
            const repeatableQuest = currentRepeatable.activeQuests.find(
                q => q._id === body.qid
            );
            if (repeatableQuest)
            {
                currentRepeatable.activeQuests =
                    currentRepeatable.activeQuests.filter(
                        q => q._id !== body.qid
                    );
                currentRepeatable.inactiveQuests.push(repeatableQuest);
            }
        }

        // make sure we level up
        pmcData.Info.Level = PlayerService.calculateLevel(pmcData);

        return completeQuestResponse;
    }

    static failQuest(pmcData, body, sessionID)
    {
        const questRewards = QuestController.applyQuestReward(
            pmcData,
            body,
            "Fail",
            sessionID
        );

        // Create a dialog message for completing the quest.
        const quest = QuestController.getQuestFromDb(body.qid, pmcData);
        const failMessageId = QuestController.getQuestLocaleIdFromDb(
            quest.failMessageText
        );
        const messageContent = DialogueHelper.createMessageContext(
            failMessageId,
            DialogueHelper.getMessageTypeValue("questFail"),
            QuestConfig.redeemTime
        );

        DialogueHelper.addDialogueMessage(
            quest.traderId,
            messageContent,
            sessionID,
            questRewards
        );

        const failedQuestResponse = ItemEventRouter.getOutput(sessionID);
        failedQuestResponse.profileChanges[sessionID].quests =
            QuestController.failedUnlocked(body.qid, sessionID);

        return failedQuestResponse;
    }

    static getQuestFromDb(questId, pmcData)
    {
        let quest = DatabaseServer.tables.templates.quests[questId];
        if (!quest)
        {
            // Check for id in repeatabe quests; we need to look at the currently active, since we
            // randomly generate the repeatable quests.
            for (const repeatable of pmcData.RepeatableQuests)
            {
                quest = repeatable.activeQuests.find(x => x._id === questId);
                if (quest)
                {
                    break;
                }
            }
        }

        return quest;
    }

    static getQuestLocaleIdFromDb(messageId, localisation = "en")
    {
        const messageArray = messageId.split(" ");

        const locale = DatabaseServer.tables.locales.global[localisation];
        const questLocale = locale.quest[messageArray[0]];
        let localeId;
        if (questLocale)
        {
            localeId = questLocale[messageArray[1]];
        }
        else
        {
            // quest not found, check in repeatable quests
            localeId = locale.repeatableQuest[messageId];
        }

        return localeId;
    }

    static handoverQuest(pmcData, body, sessionID)
    {
        const quest = QuestController.getQuestFromDb(body.qid, pmcData);
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
                QuestController.changeItemStack(
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
                const toRemove = InventoryHelper.findAndReturnChildren(
                    pmcData,
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

    static acceptedUnlocked(acceptedQuestId, sessionID)
    {
        const profile = ProfileHelper.getPmcProfile(sessionID);
        const quests = QuestController.questValues().filter(q =>
        {
            const acceptedQuestCondition = q.conditions.AvailableForStart.find(
                c =>
                {
                    return (
                        c._parent === "Quest" &&
                        c._props.target === acceptedQuestId &&
                        c._props.status[0] === QuestHelper.STATUS.Started
                    );
                }
            );

            if (!acceptedQuestCondition)
            {
                return false;
            }

            const profileQuest = profile.Quests.find(
                pq => pq.qid === acceptedQuestId
            );
            return (
                profileQuest &&
                (profileQuest.status === "Started" ||
                    profileQuest.status === "AvailableForFinish")
            );
        });

        return QuestController.cleanQuestList(quests);
    }

    static failedUnlocked(failedQuestId, sessionID)
    {
        const profile = ProfileHelper.getPmcProfile(sessionID);
        const quests = QuestController.questValues().filter(q =>
        {
            const acceptedQuestCondition = q.conditions.AvailableForStart.find(
                c =>
                {
                    return (
                        c._parent === "Quest" &&
                        c._props.target === failedQuestId &&
                        c._props.status[0] === QuestHelper.STATUS.Fail
                    );
                }
            );

            if (!acceptedQuestCondition)
            {
                return false;
            }

            const profileQuest = profile.Quests.find(
                pq => pq.qid === failedQuestId
            );
            return profileQuest && profileQuest.status === "Fail";
        });

        return QuestController.cleanQuestList(quests);
    }

    static applyMoneyBoost(quest, moneyBoost)
    {
        for (const reward of quest.rewards.Success)
        {
            if (reward.type === "Item")
            {
                if (PaymentHelper.isMoneyTpl(reward.items[0]._tpl))
                {
                    reward.items[0].upd.StackObjectsCount += Math.round(
                        (reward.items[0].upd.StackObjectsCount * moneyBoost) /
                            100
                    );
                }
            }
        }

        return quest;
    }

    /* Sets the item stack to value, or delete the item if value <= 0 */
    // TODO maybe merge this function and the one from customization
    static changeItemStack(pmcData, id, value, sessionID, output)
    {
        const inventoryItemIndex = pmcData.Inventory.items.findIndex(
            item => item._id === id
        );
        if (inventoryItemIndex < 0)
        {
            Logger.error(
                `changeItemStack: Item with _id = ${id} not found in inventory`
            );
            return;
        }

        if (value > 0)
        {
            const item = pmcData.Inventory.items[inventoryItemIndex];
            item.upd.StackObjectsCount = value;

            output.profileChanges[sessionID].items.change.push({
                _id: item._id,
                _tpl: item._tpl,
                parentId: item.parentId,
                slotId: item.slotId,
                location: item.location,
                upd: { StackObjectsCount: item.upd.StackObjectsCount },
            });
        }
        else
        {
            // this case is probably dead Code right now, since the only calling function
            // checks explicitely for Value > 0.
            output.profileChanges[sessionID].items.del.push({ _id: id });
            pmcData.Inventory.items.splice(inventoryItemIndex, 1);
        }
    }

    /**
     * Get List of All Quests as an array
     */
    static questValues()
    {
        return Object.values(DatabaseServer.tables.templates.quests);
    }

    /*
     * Quest status values
     * 0 - Locked
     * 1 - AvailableForStart
     * 2 - Started
     * 3 - AvailableForFinish
     * 4 - Success
     * 5 - Fail
     * 6 - FailRestartable
     * 7 - MarkedAsFailed
     */
    static questStatus(pmcData, questID)
    {
        for (const quest of pmcData.Quests)
        {
            if (quest.qid === questID)
            {
                return quest.status;
            }
        }

        return "Locked";
    }

    static cleanQuestList(quests)
    {
        for (const i in quests)
        {
            quests[i] = QuestController.cleanQuestConditions(quests[i]);
        }

        return quests;
    }

    static cleanQuestConditions(quest)
    {
        quest = JsonUtil.clone(quest);
        quest.conditions.AvailableForStart =
            quest.conditions.AvailableForStart.filter(
                q => q._parent === "Level"
            );

        return quest;
    }

    static resetProfileQuestCondition(sessionID, conditionId)
    {
        const startedQuests = ProfileHelper.getPmcProfile(
            sessionID
        ).Quests.filter(q => q.status === "Started");

        for (const quest of startedQuests)
        {
            const index = quest.completedConditions.indexOf(conditionId);

            if (index > -1)
            {
                quest.completedConditions.splice(index, 1);
            }
        }
    }
}

module.exports = QuestController;

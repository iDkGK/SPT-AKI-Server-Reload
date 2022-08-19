"use strict";

require("../Lib.js");

class QuestHelper
{
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

        return QuestStatus.Locked;
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
                    Logger.debug(
                        `Unrecognised Comparison Method: ${cond._props.compareMethod}`
                    );
                    return false;
            }
        }
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
            return after.filter(q =>
            {
                return knownQuestsIds.indexOf(q._id) === -1;
            });
        }
        return after;
    }

    /**
     * Increase skill points of a skill on player profile
     * @param sessionID Session id
     * @param pmcData Player profile
     * @param output output object to send back to client
     * @param skillName Name of skill to increase skill points of
     * @param progressAmount Amount of skill points to add to skill
     */
    static rewardSkillPoints(
        sessionID,
        pmcData,
        output,
        skillName,
        progressAmount
    )
    {
        const index = pmcData.Skills.Common.findIndex(s => s.Id === skillName);

        if (index === -1)
        {
            Logger.error(`Skill ${skillName} not found!`);
            return;
        }

        const profileSkill = pmcData.Skills.Common[index];
        const clientSkill =
            output.profileChanges[sessionID].skills.Common[index];

        profileSkill.Progress += progressAmount;
        profileSkill.LastAccess = TimeUtil.getTimestamp();
        clientSkill.Progress = profileSkill.Progress;
        clientSkill.LastAccess = profileSkill.LastAccess;
    }

    /* debug functions */
    static getQuestLocale(questId)
    {
        return DatabaseServer.getTables().locales.global[
            LocaleService.getDesiredLocale()
        ].quest[questId];
    }

    /**
     * Debug Routine for showing some information on the
     * quest list in question.
     */
    static dumpQuests(quests)
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
                        const locale = QuestHelper.getQuestLocale(
                            cond._props.target
                        );

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
                            const taskDescription =
                                currentQuestLocale.conditions[cond._props.id];
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
                        Logger.debug(cond);
                        break;
                }

                Logger.debug(output);
            }

            Logger.debug("-- end\n");
        }
    }

    static loyaltyRequirementCheck(loyaltyRequirementProperties, profile)
    {
        const requiredLoyaltyStanding = Number(
            loyaltyRequirementProperties.value
        );
        const operator = loyaltyRequirementProperties.compareMethod;
        const currentTraderStanding =
            profile.TradersInfo[loyaltyRequirementProperties.target]
                .loyaltyLevel; // Cast target as string as 'traderLoyalty' target prop is always string

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

    static processReward(reward)
    {
        let rewardItems = [];
        let targets = [];
        const mods = [];

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
                RagfairServerHelper.reparentPresets(target, items)
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

        for (const reward of quest.rewards[QuestStatus[state]])
        { // get the string version of QuestStatus
            if ("Item" === reward.type)
            {
                questRewards = questRewards.concat(
                    QuestHelper.processReward(reward)
                );
            }
        }

        return questRewards;
    }

    /**
     * Add quest with new state value to pmc profile
     * @param pmcData profile to add quest to
     * @param newState state the new quest should be in when added
     * @param acceptedQuest Details of quest being added
     */
    static addQuestToPMCData(pmcData, newState, acceptedQuest)
    {
        const existingQuest = pmcData.Quests.find(
            q => q.qid === acceptedQuest.qid
        );
        if (existingQuest)
        {
            // If the quest already exists, update its status
            existingQuest.startTime = TimeUtil.getTimestamp();
            existingQuest.status = newState;
            existingQuest.statusTimers[newState] = TimeUtil.getTimestamp();
        }
        else
        {
            // If the quest doesn't exists, add it
            const newQuest = {
                qid: acceptedQuest.qid,
                startTime: TimeUtil.getTimestamp(),
                status: newState,
                completedConditions: [],
                statusTimers: {},
            };
            newQuest.statusTimers[newState.toString()] =
                TimeUtil.getTimestamp();

            pmcData.Quests.push(newQuest);
        }
    }

    static acceptedUnlocked(acceptedQuestId, sessionID)
    {
        const profile = ProfileHelper.getPmcProfile(sessionID);
        const quests = QuestHelper.questValues().filter(q =>
        {
            const acceptedQuestCondition = q.conditions.AvailableForStart.find(
                c =>
                {
                    return (
                        c._parent === "Quest" &&
                        c._props.target === acceptedQuestId &&
                        c._props.status[0] === QuestStatus.Started
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
                (profileQuest.status === QuestStatus.Started ||
                    profileQuest.status === QuestStatus.AvailableForFinish)
            );
        });

        return QuestHelper.cleanQuestList(quests);
    }

    static failedUnlocked(failedQuestId, sessionID)
    {
        const profile = ProfileHelper.getPmcProfile(sessionID);
        const quests = QuestHelper.questValues().filter(q =>
        {
            const acceptedQuestCondition = q.conditions.AvailableForStart.find(
                c =>
                {
                    return (
                        c._parent === "Quest" &&
                        c._props.target === failedQuestId &&
                        c._props.status[0] === QuestStatus.Fail
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
            return profileQuest && profileQuest.status === QuestStatus.Fail;
        });

        return QuestHelper.cleanQuestList(quests);
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
     * @returns Array of IQuest objects
     */
    static questValues()
    {
        return Object.values(DatabaseServer.getTables().templates.quests);
    }

    /**
     * Reest AvailableForStart conditions for quests
     * @param quests queststo clean
     * @returns quest array without conditions
     */
    static cleanQuestList(quests)
    {
        for (const i in quests)
        {
            quests[i] = QuestHelper.cleanQuestConditions(quests[i]);
        }

        return quests;
    }

    /**
     * Reset AvailableForStart conditions on a quest
     * @param quest quest to clean
     * @returns reset IQuest object
     */
    static cleanQuestConditions(quest)
    {
        quest = JsonUtil.clone(quest);
        quest.conditions.AvailableForStart =
            quest.conditions.AvailableForStart.filter(
                q => q._parent === "Level"
            );

        return quest;
    }

    static failQuest(pmcData, body, sessionID)
    {
        QuestHelper.updateQuestState(pmcData, QuestStatus.Fail, body.qid);
        const questRewards = QuestHelper.applyQuestReward(
            pmcData,
            body,
            QuestStatus.Fail,
            sessionID
        );

        // Create a dialog message for completing the quest.
        const quest = QuestHelper.getQuestFromDb(body.qid, pmcData);
        const failMessageId = QuestHelper.getQuestLocaleIdFromDb(
            quest.failMessageText
        );

        const messageContent = DialogueHelper.createMessageContext(
            failMessageId,
            MessageType.QUEST_FAIL,
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
            QuestHelper.failedUnlocked(body.qid, sessionID);

        return failedQuestResponse;
    }

    /**
     * Get quest by id from database
     * @param questId questid to look for
     * @param pmcData player profile
     * @returns IQuest object
     */
    static getQuestFromDb(questId, pmcData)
    {
        let quest = DatabaseServer.getTables().templates.quests[questId];
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

    static getQuestLocaleIdFromDb(messageId)
    {
        const messageArray = messageId.split(" ");

        const locale =
            DatabaseServer.getTables().locales.global[
                LocaleService.getDesiredLocale()
            ];
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

    /**
     * Alter a quests state + Add a record to tis status timers object
     * @param pmcData Profile to update
     * @param newQuestState new state the qeust should be in
     * @param questId id of the quest to alter the status of
     */
    static updateQuestState(pmcData, newQuestState, questId)
    {
        // Find quest in profile, update status to that of parameter
        const questToUpdate = pmcData.Quests.find(
            quest => quest.qid === questId
        );
        if (questToUpdate)
        {
            questToUpdate.status = newQuestState;
            questToUpdate.statusTimers[newQuestState] = TimeUtil.getTimestamp();
        }
    }

    /**
     * Give player quest rewards - Skills/exp/trader standing/items/assort unlocks
     * @param pmcData Player profile
     * @param body complete quest request
     * @param state State of the quest now its complete
     * @param sessionID Seession id
     * @returns array of reward objects
     */
    static applyQuestReward(pmcData, body, state, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        const intelCenterBonus = QuestHelper.getIntelCenterRewardBonus(pmcData);

        let questDetails = QuestHelper.getQuestFromDb(body.qid, pmcData);

        if (intelCenterBonus > 0)
        {
            questDetails = QuestHelper.applyMoneyBoost(
                questDetails,
                intelCenterBonus
            ); // money = money + (money * intelCenterBonus / 100)
        }
        const questStateAsString = QuestStatus[state];
        for (const reward of questDetails.rewards[questStateAsString])
        {
            switch (reward.type)
            {
                case QuestRewardType.SKILL:
                    QuestHelper.rewardSkillPoints(
                        sessionID,
                        pmcData,
                        output,
                        reward.target,
                        Number(reward.value)
                    );
                    break;

                case QuestRewardType.EXPERIENCE:
                    ProfileHelper.addExperienceToPmc(
                        sessionID,
                        parseInt(reward.value)
                    ); // this must occur first as the output object needs to take the modified profile exp value
                    output.profileChanges[sessionID].experience =
                        pmcData.Info.Experience;
                    break;

                case QuestRewardType.TRADER_STANDING:
                    TraderHelper.addStandingToTrader(
                        sessionID,
                        reward.target,
                        parseFloat(reward.value)
                    );
                    break;

                case QuestRewardType.TRADER_UNLOCK:
                    TraderHelper.setTraderUnlockedState(
                        reward.target,
                        true,
                        sessionID
                    );
                    break;
                case QuestRewardType.ITEM:
                    // Handled by getQuestRewardItems() below
                    break;
                case QuestRewardType.ASSORTMENT_UNLOCK:
                    // Handled elsewhere, magically?
                    break;
                default:
                    Logger.error(
                        `Quest reward state ${reward.type} not handled for quest ${body.qid} ${questDetails.QuestName}`
                    );
                    break;
            }
        }

        return QuestHelper.getQuestRewardItems(questDetails, state);
    }

    /**
     * Get the intel center bonus a player has
     * @param pmcData player profile
     * @returns bonus in percent
     */
    static getIntelCenterRewardBonus(pmcData)
    {
        // find if player has money reward boost
        let intelCenterBonus = 0;
        const intelCenter = pmcData.Hideout.Areas.find(
            area => area.type === HideoutAreas.INTEL_CENTER
        );
        if (intelCenter)
        {
            if (intelCenter.level === 1)
            {
                intelCenterBonus = 5;
            }

            if (intelCenter.level > 1)
            {
                intelCenterBonus = 15;
            }
        }

        return intelCenterBonus;
    }

    static getFindItemIdForQuestItem(itemTpl)
    {
        for (const quest of QuestHelper.questValues())
        {
            const condition = quest.conditions.AvailableForFinish.find(
                c =>
                    c._parent === "FindItem" &&
                    c._props?.target?.includes(itemTpl)
            );
            if (condition)
            {
                return condition._props.id;
            }
        }
    }
}

module.exports = QuestHelper;

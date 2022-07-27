"use strict";

require("../Lib.js");

class RepeatableQuestController
{
    /**
     * This is the method reached by the /client/repeatalbeQuests/activityPeriods endpoint
     * Returns an array of objects in the format of repeatable quests to the client.
     * repeatableQuestObject = {
     *  id: Unique Id,
     *  name: "Daily",
     *  endTime: the time when the quests expire
     *  activeQuests: currently available quests in an array. Each element of quest type format (see assets/database/templates/repeatableQuests.json).
     *  inactiveQuests: the quests which were previously active (required by client to fail them if they are not completed)
     * }
     *
     * The method checks if the player level requirement for repeatable quests (e.g. daily lvl5, weekly lvl15) is met and if the previously active quests
     * are still valid. This ischecked by endTime persisted in profile accordning to the resetTime configured for each repeatable kind (daily, weekly)
     * in QuestCondig.js
     *
     * If the condition is met, new repeatableQuests are created, old quests (which are persisted in the profile.RepeatableQuests[i].activeQuests) are
     * moved to profile.RepeatableQuests[i].inactiveQuests. This memory is required to get rid of old repeatable quest data in the profile, otherwise
     * they'll litter the profile's Quests field.
     * (if the are on "Succeed" but not "Completed" we keep them, to allow the player to complete them and get the rewards)
     * The new quests generated are again persisted in profile.RepeatableQuests
     *
     *
     * @param   {string}    sessionId       Player's session id
     * @returns  {array}                    array of "repeatableQuestObjects" as descibed above
     */
    static getClientRepeatableQuests(info, sessionID)
    {
        const returnData = [];
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const time = TimeUtil.getTimestamp();

        for (const repeatableConfig of QuestConfig.repeatableQuests)
        {
            let currentRepeatable = pmcData.RepeatableQuests.find(
                x => x.name === repeatableConfig.name
            );
            if (!currentRepeatable)
            {
                currentRepeatable = {
                    name: repeatableConfig.name,
                    activeQuests: [],
                    inactiveQuests: [],
                    endTime: 0,
                    changeRequirement: {},
                };
                pmcData.RepeatableQuests.push(currentRepeatable);
            }

            if (pmcData.Info.Level >= repeatableConfig.minPlayerLevel)
            {
                if (time > currentRepeatable.endTime - 1)
                {
                    currentRepeatable.endTime =
                        time + repeatableConfig.resetTime;
                    currentRepeatable.inactiveQuests = [];
                    console.log(`Generating new ${repeatableConfig.name}`);

                    // put old quests to inactive (this is required since only then the client makes them fail due to non-completion)
                    // we also need to push them to the "inactiveQuests" list since we need to remove them from offraidData.profile.Quests
                    // after a raid (the client seems to keep quests internally and we want to get rid of old repeatable quests)
                    // and remove them from the PMC's Quests and RepeatableQuests[i].activeQuests
                    const questsToKeep = [];
                    for (
                        let i = 0;
                        i < currentRepeatable.activeQuests.length;
                        i++
                    )
                    {
                        const qid = currentRepeatable.activeQuests[i]._id;

                        // check if the quest is ready to be completed, if so, don't remove it
                        const quest = pmcData.Quests.filter(q => q.qid === qid);
                        if (quest.length > 0)
                        {
                            if (quest[0].status === "AvailableForFinish")
                            {
                                questsToKeep.push(
                                    currentRepeatable.activeQuests[i]
                                );
                                Logger.debug(
                                    `Keeping repeatable quest ${qid} in activeQuests since it is available to AvailableForFinish`
                                );
                                continue;
                            }
                        }
                        pmcData.ConditionCounters.Counters =
                            pmcData.ConditionCounters.Counters.filter(
                                c => c.qid !== qid
                            );
                        pmcData.Quests = pmcData.Quests.filter(
                            q => q.qid !== qid
                        );
                        currentRepeatable.inactiveQuests.push(
                            currentRepeatable.activeQuests[i]
                        );
                    }
                    currentRepeatable.activeQuests = questsToKeep;

                    // introduce a dynamic quest pool to avoid duplicates
                    const questTypePool =
                        RepeatableQuestController.generateQuestPool(
                            repeatableConfig
                        );

                    for (let i = 0; i < repeatableConfig.numQuests; i++)
                    {
                        let quest = null;
                        let lifeline = 0;
                        while (!quest && questTypePool.types.length > 0)
                        {
                            quest =
                                RepeatableQuestController.generateRepeatableQuest(
                                    pmcData.Info.Level,
                                    pmcData.TradersInfo,
                                    questTypePool,
                                    repeatableConfig
                                );
                            lifeline++;
                            if (lifeline > 10)
                            {
                                Logger.debug(
                                    "We were stuck in repeatable quest generation. This should never happen. Please report."
                                );
                                break;
                            }
                        }

                        // check if there are no more quest types available
                        if (questTypePool.types.length === 0)
                        {
                            break;
                        }
                        currentRepeatable.activeQuests.push(quest);
                    }
                }
                else
                {
                    console.log(
                        `[Quest Check] ${repeatableConfig.name} quests are still valid.`
                    );
                }
            }

            // create stupid redundant change requirements from quest data
            for (const quest of currentRepeatable.activeQuests)
            {
                currentRepeatable.changeRequirement[quest._id] = {
                    changeCost: quest.changeCost,
                    changeStandingCost: quest.changeStandingCost,
                };
            }

            returnData.push({
                id: ObjectId.generate(),
                name: currentRepeatable.name,
                endTime: currentRepeatable.endTime,
                activeQuests: currentRepeatable.activeQuests,
                inactiveQuests: currentRepeatable.inactiveQuests,
                changeRequirement: currentRepeatable.changeRequirement,
            });
        }

        return returnData;
    }

    /**
     * This method is called by GetClientRepeatableQuests and creates one element of quest type format (see assets/database/templates/repeatableQuests.json).
     * It randomly draws a quest type (currently Elimination, Completion or Exploration) as well as a trader who is providing the quest
     *
     * @param   {string}    pmcLevel            Player's level which is used for reward generation (and can in the future be used for quest difficulty)
     * @param   {object}    pmcTraderInfo       List of traders with unlocked information for current pmc
     * @param   {object}    questPoolType       The quest pool to draw from
     * @param   {object}    repeatableConfig    The configuration for the repeatably kind (daily, weekly) as configured in QuestConfig for the requestd quest
     * @returns {object}                        object of quest type format (see assets/database/templates/repeatableQuests.json)
     */
    static generateRepeatableQuest(
        pmcLevel,
        pmcTraderInfo,
        questTypePool,
        repeatableConfig
    )
    {
        const questType = RandomUtil.drawRandomFromList(questTypePool.types)[0];

        // get traders from whitelist and filter by quest type availability
        let traders = repeatableConfig.traderWhitelist
            .filter(x => x.questTypes.includes(questType))
            .map(x => x.traderId);
        // filter out locked traders
        traders = traders.filter(x => pmcTraderInfo[x].unlocked);
        const traderId = RandomUtil.drawRandomFromList(traders)[0];

        switch (questType)
        {
            case "Elimination":
                return RepeatableQuestController.generateEliminationQuest(
                    pmcLevel,
                    traderId,
                    questTypePool,
                    repeatableConfig
                );
            case "Completion":
                return RepeatableQuestController.generateCompletionQuest(
                    pmcLevel,
                    traderId,
                    repeatableConfig
                );
            case "Exploration":
                return RepeatableQuestController.generateExplorationQuest(
                    pmcLevel,
                    traderId,
                    questTypePool,
                    repeatableConfig
                );
            default:
                throw "Unknown mission type. Should never be here!";
        }
    }

    /**
     * Just for debug reasons. Draws dailies a random assort of dailies extracted from dumps
     *
     * @param   {array}     dailiesPool     array of dailies, for format see assets/database/templates/repeatableQuests.json
     * @param   {boolean}   factory         if set, a factory extaction quest will always be added (fast completion possible for debugging)
     * @param   {integer}   number               amount of quests to draw
     * @returns {object}                    array of objects of quest type format (see assets/database/templates/repeatableQuests.json)
     */
    static generateDebugDailies(dailiesPool, factory, number)
    {
        let randomQuests = [];
        if (factory)
        {
            // first is factory extract always add for debugging
            randomQuests.push(dailiesPool[0]);
            number -= 1;
        }

        randomQuests = randomQuests.concat(
            RandomUtil.drawRandomFromList(dailiesPool, 3, false)
        );

        for (let i = 0; i < randomQuests.length; i++)
        {
            randomQuests[i]._id = ObjectId.generate();
            const conditions = randomQuests[i].conditions.AvailableForFinish;
            for (let i = 0; i < conditions.length; i++)
            {
                if ("counter" in conditions[i]._props)
                {
                    conditions[i]._props.counter.id = ObjectId.generate();
                }
            }
        }
        return randomQuests;
    }

    /**
     * Generates the base object of quest type format given as templates in assets/database/templates/repeatableQuests.json
     * The templates include Elimination, Completion and Extraction quest types
     *
     * @param   {string}    type            quest type: "Elimination", "Completion" or "Extraction"
     * @param   {string}    traderId        trader from which the quest will be provided
     * @returns {object}                    a object which contains the base elements for repeatable quests of the requests type
     *                                      (needs to be filled with reward and conditions by called to make a valid quest)
     */
    static generateRepeatableTemplate(type, traderId)
    {
        const quest = JsonUtil.clone(
            DatabaseServer.tables.templates.repeatableQuests.templates[type]
        );
        quest._id = ObjectId.generate();
        quest.traderId = traderId;
        quest.name = quest.name.replace("{traderId}", traderId);
        quest.note = quest.note.replace("{traderId}", traderId);
        quest.description = quest.description.replace("{traderId}", traderId);
        quest.successMessageText = quest.successMessageText.replace(
            "{traderId}",
            traderId
        );
        quest.failMessageText = quest.failMessageText.replace(
            "{traderId}",
            traderId
        );
        quest.startedMessageText = quest.startedMessageText.replace(
            "{traderId}",
            traderId
        );
        quest.changeQuestMessageText = quest.changeQuestMessageText.replace(
            "{traderId}",
            traderId
        );
        return quest;
    }

    /**
     * Generates a valid Exploration quest
     *
     * @param   {integer}   pmcLevel            player's level for reward generation
     * @param   {string}    traderId            trader from which the quest will be provided
     * @param   {object}    questTypePool       Pools for quests (used to avoid redundant quests)
     * @param   {object}    repeatableConfig    The configuration for the repeatably kind (daily, weekly) as configured in QuestConfig for the requestd quest
     * @returns {object}                        object of quest type format for "Exploration" (see assets/database/templates/repeatableQuests.json)
     */
    static generateExplorationQuest(
        pmcLevel,
        traderId,
        questTypePool,
        repeatableConfig
    )
    {
        const explorationConfig = repeatableConfig.questConfig.Exploration;

        if (
            Object.keys(questTypePool.pool.Exploration.locations).length === 0
        )
        {
            // there are no more locations left for exploration; delete it as a possible quest type
            questTypePool.types = questTypePool.types.filter(
                t => t !== "Exploration"
            );
            return null;
        }

        // if the location we draw is factory, it's possible to either get factory4_day and factory4_night or only one
        // of the both
        const locationKey = RandomUtil.drawRandomFromDict(
            questTypePool.pool.Exploration.locations
        )[0];
        const locationTarget =
            questTypePool.pool.Exploration.locations[locationKey];
        // if (locationKey === "factory4_day")
        // {
        //     locationTarget = RandomUtil.DrawRandomFromList(LOCATIONS["factory4_day"], RandomUtil.RandInt(1, 3), false);
        // }

        // remove the location from the available pool
        delete questTypePool.pool.Exploration.locations[locationKey];

        const numExtracts = RandomUtil.randInt(
            1,
            explorationConfig.maxExtracts + 1
        );

        const quest = RepeatableQuestController.generateRepeatableTemplate(
            "Exploration",
            traderId
        );

        const exitStatusCondition = {
            _parent: "ExitStatus",
            _props: {
                id: ObjectId.generate(),
                dynamicLocale: true,
                status: ["Survived"],
            },
        };
        const locationCondition = {
            _parent: "Location",
            _props: {
                id: ObjectId.generate(),
                dynamicLocale: true,
                target: locationTarget,
            },
        };
        quest.conditions.AvailableForFinish[0]._props.counter.id =
            ObjectId.generate();
        quest.conditions.AvailableForFinish[0]._props.counter.conditions = [
            exitStatusCondition,
            locationCondition,
        ];
        quest.conditions.AvailableForFinish[0]._props.value = numExtracts;
        quest.conditions.AvailableForFinish[0]._props.id = ObjectId.generate();
        quest.location = locationKey;

        if (
            Math.random() <
            repeatableConfig.questConfig.Exploration.specificExits.probability
        )
        {
            // filter by whitelist, it's also possible that the field "PassageRequirement" does not exist (e.g. shoreline)
            // scav exits are not listed at all in locations.base currently. If that changes at some point, additional filtering will be required
            const possibleExists = DatabaseServer.tables.locations[
                locationKey.toLowerCase()
            ].base.exits.filter(
                x =>
                    !("PassageRequirement" in x) ||
                    repeatableConfig.questConfig.Exploration.specificExits.passageRequirementWhitelist.includes(
                        x.PassageRequirement
                    )
            );
            const exit = RandomUtil.drawRandomFromList(possibleExists, 1)[0];
            const exitCondition =
                RepeatableQuestController.generateExplorationExitCondition(
                    exit
                );
            quest.conditions.AvailableForFinish[0]._props.counter.conditions.push(
                exitCondition
            );
        }

        // difficulty for exploration goes from 1 extract to maxExtracts
        // difficulty for reward goes from 0.2...1 -> map
        const difficulty = MathUtil.mapToRange(
            numExtracts,
            1,
            explorationConfig.maxExtracts,
            0.2,
            1
        );

        quest.rewards = RepeatableQuestController.generateReward(
            pmcLevel,
            difficulty,
            traderId,
            repeatableConfig
        );

        return quest;
    }

    /**
     * Generates a valid Completion quest
     *
     * @param   {integer}   pmcLevel            player's level for requested items and reward generation
     * @param   {string}    traderId            trader from which the quest will be provided
     * @param   {object}    repeatableConfig    The configuration for the repeatably kind (daily, weekly) as configured in QuestConfig for the requestd quest
     * @returns {object}                        object of quest type format for "Completion" (see assets/database/templates/repeatableQuests.json)
     */
    static generateCompletionQuest(pmcLevel, traderId, repeatableConfig)
    {
        const completionConfig = repeatableConfig.questConfig.Completion;
        const levelsConfig = repeatableConfig.rewardScaling.levels;
        const roublesConfig = repeatableConfig.rewardScaling.roubles;

        // in the available dumps only 2 distinct items were ever requested
        let numberDistinctItems = 1;
        if (Math.random() > 0.75)
        {
            numberDistinctItems = 2;
        }

        const quest = RepeatableQuestController.generateRepeatableTemplate(
            "Completion",
            traderId
        );

        // filter the items.json for valid items to ask in Complition quest: shouldn't be a quest item or "non-existant"
        let itemSelection = ItemHelper.getRewardableItems();

        // be fair, don't let the items be more expensive than the reward
        let roublesBudget = Math.floor(
            MathUtil.interp1(pmcLevel, levelsConfig, roublesConfig) *
                RandomUtil.getFloat(0.5, 1)
        );
        roublesBudget = Math.max(roublesBudget, 5000);
        itemSelection = itemSelection.filter(
            x => ItemHelper.getItemPrice(x[0]) < roublesBudget
        );

        // we also have the option to use whitelist and/or blacklist which is defined in repeatableQuests.json as
        // [{"minPlayerLevel": 1, "itemIds": ["id1",...]}, {"minPlayerLevel": 15, "itemIds": ["id3",...]}]
        if (repeatableConfig.questConfig.Completion.useWhitelist)
        {
            const itemWhitelist =
                DatabaseServer.tables.templates.repeatableQuests.data.Completion
                    .itemsWhitelist;
            // we filter and concatenate the arrays according to current player level
            const itemIdsWhitelisted = itemWhitelist
                .filter(p => p.minPlayerLevel <= pmcLevel)
                .reduce((a, p) => a.concat(p.itemIds), []);
            itemSelection = itemSelection.filter(x =>
            {
                return itemIdsWhitelisted.some(v =>
                    ItemHelper.isOfBaseclass(x[0], v)
                );
            });
            // check if items are missing
            //const flatList = itemSelection.reduce((a, il) => a.concat(il[0]), []);
            //const missing = itemIdsWhitelisted.filter(l => !flatList.includes(l));
        }

        if (repeatableConfig.questConfig.Completion.useBlacklist)
        {
            const itemBlacklist =
                DatabaseServer.tables.templates.repeatableQuests.data.Completion
                    .itemsBlacklist;
            // we filter and concatenate the arrays according to current player level
            const itemIdsBlacklisted = itemBlacklist
                .filter(p => p.minPlayerLevel <= pmcLevel)
                .reduce((a, p) => a.concat(p.itemIds), []);
            itemSelection = itemSelection.filter(x =>
            {
                return itemIdsBlacklisted.every(
                    v => !ItemHelper.isOfBaseclass(x[0], v)
                );
            });
        }

        if (itemSelection.length === 0)
        {
            Logger.error(
                "Generate Completion Quest: No items remain. Either Whitelist is too small or Blacklist to restrictive."
            );
            return null;
        }

        // draw the items to request
        for (let i = 0; i < numberDistinctItems; i++)
        {
            const itemSelected =
                itemSelection[RandomUtil.randInt(itemSelection.length)];
            const itemUnitPrice = ItemHelper.getItemPrice(itemSelected[0]);
            let minValue = completionConfig.minRequestedAmount;
            let maxValue = completionConfig.maxRequestedAmount;
            if (
                ItemHelper.isOfBaseclass(
                    itemSelected[0],
                    ItemHelper.BASECLASS.Ammo
                )
            )
            {
                minValue = completionConfig.minRequestedBulletAmount;
                maxValue = completionConfig.maxRequestedBulletAmount;
            }
            let value = minValue;

            // get the value range within budget
            maxValue = Math.min(
                maxValue,
                Math.floor(roublesBudget / itemUnitPrice)
            );
            if (maxValue > minValue)
            {
                // if it doesn't blow the budget we have for the request, draw a random amount of the selected
                // item type to be requested
                value = RandomUtil.randInt(minValue, maxValue + 1);
            }
            roublesBudget -= value * itemUnitPrice;

            // push a CompletionCondition with the item and the amount of the item
            quest.conditions.AvailableForFinish.push(
                RepeatableQuestController.generateCompletionAvailableForFinish(
                    itemSelected[0],
                    value
                )
            );

            if (roublesBudget > 0)
            {
                // reduce the list possible items to fulfill the new budget constraint
                itemSelection = itemSelection.filter(
                    x => ItemHelper.getItemPrice(x[0]) < roublesBudget
                );
                if (itemSelection.length === 0)
                {
                    break;
                }
            }
            else
            {
                break;
            }
        }

        quest.rewards = RepeatableQuestController.generateReward(
            pmcLevel,
            1,
            traderId,
            repeatableConfig
        );

        return quest;
    }

    /**
     * Generates a valid Elimination quest
     *
     * @param   {integer}   pmcLevel            player's level for requested items and reward generation
     * @param   {string}    traderId            trader from which the quest will be provided
     * @param   {object}    questTypePool       Pools for quests (used to avoid redundant quests)
     * @param   {object}    repeatableConfig    The configuration for the repeatably kind (daily, weekly) as configured in QuestConfig for the requestd quest
     * @returns {object}                        object of quest type format for "Elimination" (see assets/database/templates/repeatableQuests.json)
     */
    static generateEliminationQuest(
        pmcLevel,
        traderId,
        questTypePool,
        repeatableConfig
    )
    {
        const eliminationConfig = repeatableConfig.questConfig.Elimination;
        const locationsConfig = repeatableConfig.locations;
        let targetsConfig = RepeatableQuestController.probabilityObjectArray(
            eliminationConfig.targets
        );
        const bodypartsConfig =
            RepeatableQuestController.probabilityObjectArray(
                eliminationConfig.bodyParts
            );

        // the difficulty of the quest varies in difficulty depending on the condition
        // possible conditions are
        // - amount of npcs to kill
        // - type of npc to kill (scav, boss, pmc)
        // - with hit to what body part they should be killed
        // - from what distance they should be killed
        // a random combination of listed conditions can be required
        // possible conditions elements and their relative probability can be defined in QuestConfig.js
        // We use RandomUtil.ProbabilityObjectArray to draw by relative probability. e.g. for targets:
        // "targets": {
        //    "Savage": 7,
        //    "AnyPmc": 2,
        //    "bossBully": 0.5
        //}
        // higher is more likely. We define the difficulty to be the inverse of the relative probability.

        // We want to generate a reward which is scaled by the difficulty of this mission. To get a upper bound with which we scale
        // the actual difficulty we calculate the minimum and maximum difficulty (max being the sum of max of each condition type
        // times the number of kills we have to perform):

        // the minumum difficulty is the difficulty for the most probable (= easiest target) with no additional conditions
        const minDifficulty = 1 / targetsConfig.maxProbability(); // min difficulty is lowest amount of scavs without any constraints

        // Target on bodyPart max. difficulty is that of the least probable element
        const maxTargetDifficulty = 1 / targetsConfig.minProbability();
        const maxBodyPartsDifficulty =
            eliminationConfig.minKills / bodypartsConfig.minProbability();

        // maxDistDifficulty is defined by 2, this could be a tuning parameter if we don't like the reward generation
        const maxDistDifficulty = 2;

        const maxKillDifficulty = eliminationConfig.maxKills;

        function difficultyWeighing(target, bodyPart, dist, kill)
        {
            return Math.sqrt(Math.sqrt(target) + bodyPart + dist) * kill;
        }

        targetsConfig = targetsConfig.filter(x =>
            Object.keys(questTypePool.pool.Elimination.targets).includes(x.key)
        );
        if (
            targetsConfig.length === 0 ||
            targetsConfig.every(x => x.data.isBoss)
        )
        {
            // there are no more targets left for elimination; delete it as a possible quest type
            // also if only bosses are left we need to leave otherwise it's a guaranteed boss elimination
            // -> then it would not be a quest with low probability anymore
            questTypePool.types = questTypePool.types.filter(
                t => t !== "Elimination"
            );
            return null;
        }

        const targetKey = targetsConfig.draw()[0];
        const targetDifficulty = 1 / targetsConfig.probability(targetKey);

        let locations =
            questTypePool.pool.Elimination.targets[targetKey].locations;
        // we use any as location if "any" is in the pool and we do not hit the specific location random
        // we use any also if the random condition is not met in case only "any" was in the pool
        let locationKey = "any";
        if (
            locations.includes("any") &&
            (repeatableConfig.questConfig.Elimination.specificLocationProb <
                Math.random() ||
                locations.length <= 1)
        )
        {
            locationKey = "any";
            delete questTypePool.pool.Elimination.targets[targetKey];
        }
        else
        {
            locations = locations.filter(l => l !== "any");
            if (locations.length > 0)
            {
                locationKey = RandomUtil.drawRandomFromList(locations)[0];
                questTypePool.pool.Elimination.targets[targetKey].locations =
                    locations.filter(l => l !== locationKey);
                if (
                    questTypePool.pool.Elimination.targets[targetKey].locations
                        .length === 0
                )
                {
                    delete questTypePool.pool.Elimination.targets[targetKey];
                }
            }
            else
            {
                // never should reach this if everything works out
                Logger.debug(
                    "Ecountered issue when creating Elimination quest. Please report."
                );
            }
        }

        // draw the target body part and calculate the difficulty factor
        let bodyPartsToClient = null;
        let bodyPartDifficulty = 0;
        if (eliminationConfig.bodyPartProb > Math.random())
        {
            // if we add a bodyPart condition, we draw randomly one or two parts
            // each bodyPart of the BODYPARTS ProbabilityObjectArray includes the string(s) which need to be presented to the client in ProbabilityObjectArray.data
            // e.g. we draw "Arms" from the probability array but must present ["LeftArm", "RightArm"] to the client
            bodyPartsToClient = [];
            const bodyParts = bodypartsConfig.draw(
                RandomUtil.randInt(1, 3),
                false
            );
            let probability = 0;
            for (const bi of bodyParts)
            {
                // more than one part lead to an "OR" condition hence more parts reduce the difficulty
                probability += bodypartsConfig.probability(bi);
                for (const biClient of bodypartsConfig.data(bi))
                {
                    bodyPartsToClient.push(biClient);
                }
            }
            bodyPartDifficulty = 1 / probability;
        }

        // draw a distance condition
        let distance = null;
        let distanceDifficulty = 0;
        let isDistanceRequirementAllowed =
            !repeatableConfig.questConfig.Elimination.distLocationBlacklist.includes(
                locationKey
            );

        if (targetsConfig.data(targetKey).isBoss)
        {
            // get all boss spawn information
            const bossSpawns = Object.values(DatabaseServer.tables.locations)
                .filter(x => "base" in x && "Id" in x.base)
                .map(x => ({
                    Id: x.base.Id,
                    BossSpawn: x.base.BossLocationSpawn,
                }));
            // filter for the current boss to spawn on map
            const thisBossSpawns = bossSpawns
                .map(x => ({
                    Id: x.Id,
                    BossSpawn: x.BossSpawn.filter(
                        e => e.BossName === targetKey
                    ),
                }))
                .filter(x => x.BossSpawn.length > 0);
            // remove blacklisted locations
            const allowedSpawns = thisBossSpawns.filter(
                x =>
                    !repeatableConfig.questConfig.Elimination.distLocationBlacklist.includes(
                        x.Id
                    )
            );
            // if the boss spawns on nom-blacklisted locations and the current location is allowed we can generate a distance kill requirement
            isDistanceRequirementAllowed =
                isDistanceRequirementAllowed && allowedSpawns.length > 0;
        }

        if (
            eliminationConfig.distProb > Math.random() &&
            isDistanceRequirementAllowed
        )
        {
            // random distance with lower values more likely; simple distribution for starters...
            distance = Math.floor(
                Math.abs(Math.random() - Math.random()) *
                    (1 +
                        eliminationConfig.maxDist -
                        eliminationConfig.minDist) +
                    eliminationConfig.minDist
            );
            distance = Math.ceil(distance / 5) * 5;
            distanceDifficulty =
                (maxDistDifficulty * distance) / eliminationConfig.maxDist;
        }

        // draw how many npcs are required to be killed
        const kills = RandomUtil.randInt(
            eliminationConfig.minKills,
            eliminationConfig.maxKills + 1
        );
        const killDifficulty = kills;

        // not perfectly happy here; we give difficulty = 1 to the quest reward generation when we have the most diffucult mission
        // e.g. killing reshala 5 times from a distance of 200m with a headshot.
        const maxDifficulty = difficultyWeighing(1, 1, 1, 1);
        const curDifficulty = difficultyWeighing(
            targetDifficulty / maxTargetDifficulty,
            bodyPartDifficulty / maxBodyPartsDifficulty,
            distanceDifficulty / maxDistDifficulty,
            killDifficulty / maxKillDifficulty
        );

        // aforementioned issue makes it a bit crazy since now all easier quests give significantly lower rewards than Completion / Exploration
        // I therefore moved the mapping a bit up (from 0.2...1 to 0.5...2) so that normal difficulty still gives good reward and having the
        // crazy maximum difficulty will lead to a higher difficulty reward gain factor than 1
        const difficulty = MathUtil.mapToRange(
            curDifficulty,
            minDifficulty,
            maxDifficulty,
            0.5,
            2
        );

        const quest = RepeatableQuestController.generateRepeatableTemplate(
            "Elimination",
            traderId
        );

        quest.conditions.AvailableForFinish[0]._props.counter.id =
            ObjectId.generate();
        quest.conditions.AvailableForFinish[0]._props.counter.conditions = [];
        if (locationKey !== "any")
        {
            quest.conditions.AvailableForFinish[0]._props.counter.conditions.push(
                RepeatableQuestController.generateEliminationLocation(
                    locationsConfig[locationKey]
                )
            );
        }
        quest.conditions.AvailableForFinish[0]._props.counter.conditions.push(
            RepeatableQuestController.generateEliminationCondition(
                targetKey,
                bodyPartsToClient,
                distance
            )
        );
        quest.conditions.AvailableForFinish[0]._props.value = kills;
        quest.conditions.AvailableForFinish[0]._props.id = ObjectId.generate();
        quest.location = locationKey;

        quest.rewards = RepeatableQuestController.generateReward(
            pmcLevel,
            Math.min(difficulty, 1),
            traderId,
            repeatableConfig
        );

        return quest;
    }

    /**
     * Exploration repeatable quests can specify a required extraction point.
     * This method creates the according object which will be appended to the conditions array
     *
     * @param   {string}        exit                The exit name to generate the condition for
     * @returns {object}                            Exit condition
     */
    static generateExplorationExitCondition(exit)
    {
        return {
            _props: {
                exitName: exit.Name,
                id: ObjectId.generate(),
                dynamicLocale: true,
            },
            _parent: "ExitName",
        };
    }

    /**
     * A repeatable quest, besides some more or less static components, exists of reward and condition (see assets/database/templates/repeatableQuests.json)
     * This is a helper method for GenerateCompletionQuest to create a completion condition (of which a completion quest theoretically can have many)
     *
     * @param   {string}    targetItemId    id of the item to request
     * @param   {integer}   value           amount of items of this specific type to request
     * @returns {object}                    object of "Completion"-condition
     */
    static generateCompletionAvailableForFinish(targetItemId, value)
    {
        let minDurability = 0;
        let onlyFoundInRaid = true;
        if (
            ItemHelper.isOfBaseclass(
                targetItemId,
                ItemHelper.BASECLASS.Weapon
            ) ||
            ItemHelper.isOfBaseclass(targetItemId, ItemHelper.BASECLASS.Armor)
        )
        {
            minDurability = 80;
        }

        if (
            ItemHelper.isOfBaseclass(
                targetItemId,
                ItemHelper.BASECLASS.DogTagUsec
            ) ||
            ItemHelper.isOfBaseclass(
                targetItemId,
                ItemHelper.BASECLASS.DogTagBear
            )
        )
        {
            onlyFoundInRaid = false;
        }

        return {
            _props: {
                id: ObjectId.generate(),
                parentId: "",
                dynamicLocale: true,
                index: 0,
                visibilityConditions: [],
                target: [targetItemId],
                value: value,
                minDurability: minDurability,
                maxDurability: 100,
                dogtagLevel: 0,
                onlyFoundInRaid: onlyFoundInRaid,
            },
            _parent: "HandoverItem",
            dynamicLocale: true,
        };
    }

    /**
     * A repeatable quest, besides some more or less static components, exists of reward and condition (see assets/database/templates/repeatableQuests.json)
     * This is a helper method for GenerateEliminationQuest to create a location condition.
     *
     * @param   {string}    location        the location on which to fulfill the elimination quest
     * @returns {object}                    object of "Elimination"-location-subcondition
     */
    static generateEliminationLocation(location)
    {
        return {
            _props: {
                target: location,
                id: ObjectId.generate(),
                dynamicLocale: true,
            },
            _parent: "Location",
        };
    }

    /**
     * A repeatable quest, besides some more or less static components, exists of reward and condition (see assets/database/templates/repeatableQuests.json)
     * This is a helper method for GenerateEliminationQuest to create a kill condition.
     *
     * @param   {string}    target          array of target npcs e.g. "AnyPmc", "Savage"
     * @param   {array}     bodyParts       array of body parts with which to kill e.g. ["stomach", "thorax"]
     * @param   {number}    distance        distance from which to kill (currently only >= supported)
     * @returns {object}                    object of "Elimination"-kill-subcondition
     */
    static generateEliminationCondition(target, bodyPart, distance)
    {
        const killConditionProps = {
            target: target,
            value: 1,
            id: ObjectId.generate(),
            dynamicLocale: true,
        };

        if (target.startsWith("boss"))
        {
            killConditionProps.target = "Savage";
            killConditionProps.savageRole = [target];
        }

        if (bodyPart)
        {
            killConditionProps.bodyPart = bodyPart;
        }

        if (distance)
        {
            killConditionProps.distance = {
                compareMethod: ">=",
                value: distance,
            };
        }

        return {
            _props: killConditionProps,
            _parent: "Kills",
        };
    }

    /**
     * Used to create a quest pool during each cycle of repeatable quest generation. The pool will be subsequently
     * narrowed down during quest generation to avoid duplicate quests. Like duplicate extractions or elimination quests
     * where you have to e.g. kill scavs in same locations.
     *
     * @returns {object}                    the quest pool
     */
    static generateQuestPool(repeatableConfig)
    {
        const questPool = {
            types: repeatableConfig.types.slice(),
            pool: {
                Exploration: {},
                Elimination: {
                    targets: {},
                },
            },
        };
        for (const location in repeatableConfig.locations)
        {
            if (location !== "any")
            {
                questPool.pool.Exploration.locations[location] =
                    repeatableConfig.locations[location];
            }
        }

        const targetsConfig = RepeatableQuestController.probabilityObjectArray(
            repeatableConfig.questConfig.Elimination.targets
        );
        for (const probabilityObject of targetsConfig)
        {
            if (!probabilityObject.data.isBoss)
            {
                questPool.pool.Elimination.targets[probabilityObject.key] = {
                    locations: Object.keys(repeatableConfig.locations),
                };
            }
            else
            {
                questPool.pool.Elimination.targets[probabilityObject.key] = {
                    locations: ["any"],
                };
            }
        }

        return questPool;
    }

    /**
     * Generate the reward for a mission. A reward can consist of
     * - Experience
     * - Money
     * - Items
     * - Trader Reputation
     *
     * The reward is dependent on the player level as given by the wiki. The exact mapping of pmcLevel to
     * experience / money / items / trader reputation can be defined in QuestConfig.js
     *
     * There's also a random variation of the reward the spread of which can be also defined in the config.
     *
     * Additonaly, a scaling factor w.r.t. quest difficulty going from 0.2...1 can be used
     *
     * @param   {integer}   pmcLevel            player's level
     * @param   {number}    difficulty          a reward scaling factor goint from 0.2 to 1
     * @param   {string}    traderId            the trader for reputation gain (and possible in the future filtering of reward item type based on trader)
     * @param   {object}    repeatableConfig    The configuration for the repeatably kind (daily, weekly) as configured in QuestConfig for the requestd quest
     * @returns {object}                        object of "Reward"-type that can be given for a repeatable mission
     */
    static generateReward(pmcLevel, difficulty, traderId, repeatableConfig)
    {
        // difficulty could go from 0.2 ... -> for lowest diffuculty receive 0.2*nominal reward
        const levelsConfig = repeatableConfig.rewardScaling.levels;
        const roublesConfig = repeatableConfig.rewardScaling.roubles;
        const xpConfig = repeatableConfig.rewardScaling.experience;
        const itemsConfig = repeatableConfig.rewardScaling.items;
        const rewardSpreadConfig = repeatableConfig.rewardScaling.rewardSpread;
        const reputationConfig = repeatableConfig.rewardScaling.reputation;

        if (isNaN(difficulty))
        {
            difficulty = 1;
            Logger.warning(
                "Repeatable Reward Generation: Difficulty was NaN. Setting to 1."
            );
        }

        // rewards are generated based on pmcLevel, difficulty and a random spread
        const rewardXP = Math.floor(
            difficulty *
                MathUtil.interp1(pmcLevel, levelsConfig, xpConfig) *
                RandomUtil.getFloat(
                    1 - rewardSpreadConfig,
                    1 + rewardSpreadConfig
                )
        );
        const rewardRoubles = Math.floor(
            difficulty *
                MathUtil.interp1(pmcLevel, levelsConfig, roublesConfig) *
                RandomUtil.getFloat(
                    1 - rewardSpreadConfig,
                    1 + rewardSpreadConfig
                )
        );
        const rewardNumItems = RandomUtil.randInt(
            1,
            Math.round(MathUtil.interp1(pmcLevel, levelsConfig, itemsConfig)) +
                1
        );
        const rewardReputation =
            Math.round(
                100 *
                    difficulty *
                    MathUtil.interp1(pmcLevel, levelsConfig, reputationConfig) *
                    RandomUtil.getFloat(
                        1 - rewardSpreadConfig,
                        1 + rewardSpreadConfig
                    )
            ) / 100;

        // possible improvement -> draw trader-specific items e.g. with ItemHelper.isOfBaseclass(val._id, ItemHelper.BASECLASS.FoodDrink)
        let roublesBudget = rewardRoubles;

        // first filter for type and baseclass to avoid lookup in handbook for non-available items
        const rewardableItems = ItemHelper.getRewardableItems();
        // blacklist
        let itemSelection = rewardableItems.filter(
            x =>
                !ItemHelper.isOfBaseclass(
                    x[0],
                    ItemHelper.BASECLASS.DogTagUsec
                ) &&
                !ItemHelper.isOfBaseclass(
                    x[0],
                    ItemHelper.BASECLASS.DogTagBear
                ) &&
                !ItemHelper.isOfBaseclass(x[0], ItemHelper.BASECLASS.Mount)
        );
        const minPrice = Math.min(25000, 0.5 * roublesBudget);
        itemSelection = itemSelection.filter(
            x =>
                ItemHelper.getItemPrice(x[0]) < roublesBudget &&
                ItemHelper.getItemPrice(x[0]) > minPrice
        );
        if (itemSelection.length === 0)
        {
            Logger.warning(
                `Rpeatable Quest Reward Generation: No item found in price range ${minPrice} to ${roublesBudget}`
            );
            // in case we don't find any items in the price range
            itemSelection = rewardableItems.filter(
                x =>
                    !ItemHelper.isOfBaseclass(
                        x[0],
                        ItemHelper.BASECLASS.DogTagUsec
                    ) &&
                    !ItemHelper.isOfBaseclass(
                        x[0],
                        ItemHelper.BASECLASS.DogTagBear
                    ) &&
                    !ItemHelper.isOfBaseclass(
                        x[0],
                        ItemHelper.BASECLASS.Mount
                    ) &&
                    ItemHelper.getItemPrice(x[0]) < roublesBudget
            );
        }

        const rewards = {
            Started: [],
            Success: [
                {
                    value: rewardXP,
                    type: "Experience",
                    index: 0,
                },
            ],
            Fail: [],
        };

        if (traderId !== TraderHelper.TRADER.Peacekeeper)
        {
            rewards.Success.push(
                RepeatableQuestController.generateRewardItem(
                    ItemHelper.MONEY.Roubles,
                    rewardRoubles,
                    1
                )
            );
        }
        else
        {
            // convert to equivalent dollars
            rewards.Success.push(
                RepeatableQuestController.generateRewardItem(
                    ItemHelper.MONEY.Dollars,
                    Math.floor(rewardRoubles / 142.86),
                    1
                )
            );
        }

        let index = 2;
        if (itemSelection.length > 0)
        {
            for (let i = 0; i < rewardNumItems; i++)
            {
                let value = 1;
                let children = null;
                const itemSelected =
                    itemSelection[RandomUtil.randInt(itemSelection.length)];
                if (
                    ItemHelper.isOfBaseclass(
                        itemSelected[0],
                        ItemHelper.BASECLASS.Ammo
                    )
                )
                {
                    // if we provide ammo we don't to provide just one bullet
                    value = RandomUtil.randInt(
                        20,
                        itemSelected[1]._props.StackMaxSize + 1
                    );
                }
                else if (
                    ItemHelper.isOfBaseclass(
                        itemSelected[0],
                        ItemHelper.BASECLASS.Weapon
                    )
                )
                {
                    const presets = PresetHelper.getPresets(itemSelected[0]);
                    const defaultPreset = presets.find(x => x._encyclopedia);
                    if (defaultPreset)
                    {
                        children = RagfairServer.reparentPresets(
                            defaultPreset._items[0],
                            defaultPreset._items
                        );
                    }
                }
                rewards.Success.push(
                    RepeatableQuestController.generateRewardItem(
                        itemSelected[0],
                        value,
                        index,
                        children
                    )
                );

                // TODO: maybe also non-default use ragfair to calculate the price
                // RagfairServer.getWeaponPresetPrice(item, items, existingPrice)

                roublesBudget -=
                    value * ItemHelper.getItemPrice(itemSelected[0]);
                index += 1;
                // if we still have budget narrow down the items
                if (roublesBudget > 0)
                {
                    itemSelection = itemSelection.filter(
                        x => ItemHelper.getItemPrice(x[0]) < roublesBudget
                    );
                    if (itemSelection.length === 0)
                    {
                        break;
                    }
                }
                else
                {
                    break;
                }
            }
        }

        if (rewardReputation > 0)
        {
            const reward = {
                target: traderId,
                value: rewardReputation,
                type: "TraderStanding",
                index: index,
            };
            rewards.Success.push(reward);
        }

        return rewards;
    }

    /**
     * Helper to create a reward item structured as required by the client
     *
     * @param   {string}    tpl             itemId of the rewarded item
     * @param   {integer}   value           amount of items to give
     * @param   {integer}   index           all rewards will be appended to a list, for unkown reasons the client wants the index
     * @returns {object}                    object of "Reward"-item-type
     */
    static generateRewardItem(tpl, value, index, preset = null)
    {
        const id = ObjectId.generate();
        const rewardItem = {
            target: id,
            value: value,
            type: "Item",
            index: index,
        };

        const rootItem = {
            _id: id,
            _tpl: tpl,
            upd: {
                StackObjectsCount: value,
            },
        };

        if (preset)
        {
            rewardItem.items = RagfairServer.reparentPresets(rootItem, preset);
        }
        else
        {
            rewardItem.items = [rootItem];
        }
        return rewardItem;
    }

    static debugLogRepeatableQuestIds(pmcData)
    {
        for (const repeatable of pmcData.RepeatableQuests)
        {
            const activeQuestsIds = [];
            const inactiveQuestsIds = [];
            for (const active of repeatable.activeQuests)
            {
                activeQuestsIds.push(active._id);
            }

            for (const inactive of repeatable.inactiveQuests)
            {
                inactiveQuestsIds.push(inactive._id);
            }

            Logger.debug(`${repeatable.name} activeIds ${activeQuestsIds}`);
            Logger.debug(`${repeatable.name} inactiveIds ${inactiveQuestsIds}`);
        }
    }

    static probabilityObjectArray(configArrayInput)
    {
        const configArray = JsonUtil.clone(configArrayInput);
        const probabilityArray = new RandomUtil.ProbabilityObjectArray();
        for (const configObject of configArray)
        {
            probabilityArray.push(
                new RandomUtil.ProbabilityObject(
                    configObject.key,
                    configObject.relativeProbability,
                    configObject.data
                )
            );
        }
        return probabilityArray;
    }

    static changeRepeatableQuest(pmcDataIn, body, sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        let repeatableToChange;
        let changeRequirement;
        for (const currentRepeatable of pmcData.RepeatableQuests)
        {
            const numQuests = currentRepeatable.activeQuests.length;
            currentRepeatable.activeQuests =
                currentRepeatable.activeQuests.filter(x => x._id !== body.qid);
            if (numQuests > currentRepeatable.activeQuests.length)
            {
                changeRequirement = JsonUtil.clone(
                    currentRepeatable.changeRequirement[body.qid]
                );
                delete currentRepeatable.changeRequirement[body.qid];
                const repeatableConfig = QuestConfig.repeatableQuests.find(
                    x => x.name === currentRepeatable.name
                );
                const questTypePool =
                    RepeatableQuestController.generateQuestPool(
                        repeatableConfig
                    );
                // TODO: somehow we need to reduce the questPool by the currently active quests (for all repeatables)
                let quest = null;
                let lifeline = 0;
                while (!quest && questTypePool.types.length > 0)
                {
                    quest = RepeatableQuestController.generateRepeatableQuest(
                        pmcData.Info.Level,
                        pmcData.TradersInfo,
                        questTypePool,
                        repeatableConfig
                    );
                    lifeline++;
                    if (lifeline > 10)
                    {
                        Logger.debug(
                            "We were stuck in repeatable quest generation. This should never happen. Please report."
                        );
                        break;
                    }
                }

                if (quest)
                {
                    currentRepeatable.activeQuests.push(quest);
                    currentRepeatable.changeRequirement[quest._id] = {
                        changeCost: quest.changeCost,
                        changeStandingCost: quest.changeStandingCost,
                    };
                }
                // we found and replaced the quest in current repeatable
                repeatableToChange = JsonUtil.clone(currentRepeatable);
                delete repeatableToChange.inactiveQuests;
                break;
            }
        }

        if (!repeatableToChange)
        {
            throw "Could not find repeatable to replace";
        }

        let output = ItemEventRouter.getOutput(sessionID);

        for (const cost of changeRequirement.changeCost)
        {
            output = PaymentService.addPaymentToOutput(
                pmcData,
                cost.templateId,
                cost.count,
                sessionID,
                output
            );
            if (output.warnings.length > 0)
            {
                return output;
            }
        }
        output.profileChanges[sessionID].repeatableQuests = [
            repeatableToChange,
        ];
        return output;
    }
}

module.exports = RepeatableQuestController;

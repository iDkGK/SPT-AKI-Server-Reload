"use strict";

require("../Lib.js");

class BotGenerator
{
    /**
     * Generate a player scav bot object
     * @param role e.g. assault / pmcbot
     * @param difficulty easy/normal/hard/impossible
     * @param botTemplate base bot template to use  (e.g. assault/pmcbot)
     * @returns
     */
    static generatePlayerScav(role, difficulty, botTemplate)
    {
        let bot = BotGenerator.getCloneOfBotBase();
        bot.Info.Settings.BotDifficulty = difficulty;
        bot.Info.Settings.Role = role;
        bot.Info.Side = "Savage";
        bot = BotGenerator.generateBot(bot, role, botTemplate, false, true);

        return bot;
    }

    static generate(sessionId, info)
    {
        const output = [];
        const playerLevel = ProfileHelper.getPmcProfile(sessionId).Info.Level;

        for (const condition of info.conditions)
        {
            for (let i = 0; i < condition.Limit; i++)
            {
                const pmcSide = BotGenerator.getRandomisedPmcSide();
                let role = condition.Role;

                // Bot can be a pmc if its NOT a player scav
                const isPmc = BotGenerator.shouldBotBePmc(role);

                let bot = BotGenerator.getCloneOfBotBase();

                // If bot will be Pmc, get Pmc specific difficulty settings
                bot.Info.Settings.BotDifficulty = isPmc
                    ? BotGenerator.getPMCDifficulty(condition.Difficulty)
                    : condition.Difficulty;

                if (isPmc)
                {
                    // Set bot role to usec/bear so we can generate bot gear with corrisponding json
                    role = pmcSide;
                }

                bot.Info.Settings.Role = role;
                bot.Info.Side = isPmc ? pmcSide : "Savage";

                const baseBotNode = BotHelper.getBotTemplate(role);

                BotEquipmentFilterService.filterBotEquipment(
                    baseBotNode,
                    playerLevel,
                    isPmc,
                    role
                );

                bot = BotGenerator.generateBot(
                    bot,
                    role.toLowerCase(),
                    baseBotNode,
                    isPmc
                );

                if (isPmc)
                {
                    // Restore botRole back to its intended type now we've generated its equipment/loot
                    bot.Info.Settings.Role = BotGenerator.getPmcRole(pmcSide);
                }

                output.unshift(bot);
            }
        }

        BotGenerator.logPmcGeneratedCount(output);
        return output;
    }

    /**
     * Choose if a bot should become a PMC by checking if bot type is allowed to become a Pmc in botConfig.convertFromChances and doing a random int check
     * @param botRole the bot role to check if should be a pmc
     * @returns true if should be a pmc
     */
    static shouldBotBePmc(botRole)
    {
        const botRoleLowered = botRole.toLowerCase();
        const botConvertMinMax =
            BotConfig.pmc.convertIntoPmcChance[botRoleLowered];

        // no bot type defined in config, default to false
        if (!botConvertMinMax)
        {
            return false;
        }

        return (
            botRoleLowered in BotConfig.pmc.convertIntoPmcChance &&
            RandomUtil.getInt(0, 99) <
                RandomUtil.getInt(botConvertMinMax.min, botConvertMinMax.max)
        );
    }

    /**
     * Get a randomised PMC side based on bot config value 'isUsec'
     * @returns pmc side as string
     */
    static getRandomisedPmcSide()
    {
        return RandomUtil.getInt(0, 99) < BotConfig.pmc.isUsec
            ? "Usec"
            : "Bear";
    }

    /**
     * Get a clone of the database\bots\base.json file
     * @returns IBotBase object
     */
    static getCloneOfBotBase()
    {
        return JsonUtil.clone(DatabaseServer.getTables().bots.base);
    }

    static generateBot(bot, role, node, isPmc, isPlayerScav = false)
    {
        const levelResult = BotGenerator.generateRandomLevel(
            node.experience.level.min,
            node.experience.level.max
        );

        bot.Info.Nickname = `${RandomUtil.getArrayValue(node.firstName)} ${
            RandomUtil.getArrayValue(node.lastName) || ""
        }`;

        if (BotConfig.showTypeInNickname && !isPlayerScav)
        {
            bot.Info.Nickname += ` ${role}`;
        }

        const skipChristmasItems = !GameEventHelper.christmasEventEnabled();
        if (skipChristmasItems)
        {
            BotGenerator.removeChristmasItemsFromBotInventory(node.inventory);
        }

        bot.Info.Experience = levelResult.exp;
        bot.Info.Level = levelResult.level;
        bot.Info.Settings.Experience = RandomUtil.getInt(
            node.experience.reward.min,
            node.experience.reward.max
        );
        bot.Info.Settings.StandingForKill = node.experience.standingForKill;
        bot.Info.Voice = RandomUtil.getArrayValue(node.appearance.voice);
        bot.Health = BotGenerator.generateHealth(
            node.health,
            bot.Info.Side === "Savage"
        );
        bot.Skills = BotGenerator.generateSkills(node.skills);
        bot.Customization.Head = RandomUtil.getArrayValue(node.appearance.head);
        bot.Customization.Body = RandomUtil.getArrayValue(node.appearance.body);
        bot.Customization.Feet = RandomUtil.getArrayValue(node.appearance.feet);
        bot.Customization.Hands = RandomUtil.getArrayValue(
            node.appearance.hands
        );
        bot.Inventory = BotInventoryGenerator.generateInventory(
            node.inventory,
            node.chances,
            node.generation,
            role,
            isPmc
        );

        if (BotHelper.isBotPmc(role))
        {
            bot = BotGenerator.generateDogtag(bot);
        }

        // generate new bot ID
        bot = BotGenerator.generateId(bot);

        // generate new inventory ID
        bot = BotGenerator.generateInventoryID(bot);

        return bot;
    }

    /**
     * Log the number of PMCs generated to the debug console
     */
    static logPmcGeneratedCount(output)
    {
        const pmcCount = output.reduce(
            (acc, cur) =>
                cur.Info.Side === "Bear" || cur.Info.Side === "Usec"
                    ? ++acc
                    : acc,
            0
        );
        Logger.debug(
            `Generated ${output.length} total bots. Replaced ${pmcCount} with PMCs`
        );
    }

    static generateRandomLevel(min, max)
    {
        const expTable =
            DatabaseServer.getTables().globals.config.exp.level.exp_table;
        const maxLevel = Math.min(max, expTable.length);

        // Get random level based on the exp table.
        let exp = 0;
        const level = RandomUtil.getInt(min, maxLevel);

        for (let i = 0; i < level; i++)
        {
            exp += expTable[i].exp;
        }

        // Sprinkle in some random exp within the level, unless we are at max level.
        if (level < expTable.length - 1)
        {
            exp += RandomUtil.getInt(0, expTable[level].exp - 1);
        }

        return { level, exp };
    }

    /**
     * Converts health object to the required format
     * @param healthObj health object from bot json
     * @param playerScav Is a pscav bot being generated
     * @returns PmcHealth object
     */
    static generateHealth(healthObj, playerScav = false)
    {
        const bodyParts = playerScav
            ? healthObj.BodyParts[0]
            : RandomUtil.getArrayValue(healthObj.BodyParts);

        const newHealth = {
            Hydration: {
                Current: RandomUtil.getInt(
                    healthObj.Hydration.min,
                    healthObj.Hydration.max
                ),
                Maximum: healthObj.Hydration.max,
            },
            Energy: {
                Current: RandomUtil.getInt(
                    healthObj.Energy.min,
                    healthObj.Energy.max
                ),
                Maximum: healthObj.Energy.max,
            },
            Temperature: {
                Current: RandomUtil.getInt(
                    healthObj.Temperature.min,
                    healthObj.Temperature.max
                ),
                Maximum: healthObj.Temperature.max,
            },
            BodyParts: {
                Head: {
                    Health: {
                        Current: RandomUtil.getInt(
                            bodyParts.Head.min,
                            bodyParts.Head.max
                        ),
                        Maximum: bodyParts.Head.max,
                    },
                },
                Chest: {
                    Health: {
                        Current: RandomUtil.getInt(
                            bodyParts.Chest.min,
                            bodyParts.Chest.max
                        ),
                        Maximum: bodyParts.Chest.max,
                    },
                },
                Stomach: {
                    Health: {
                        Current: RandomUtil.getInt(
                            bodyParts.Stomach.min,
                            bodyParts.Stomach.max
                        ),
                        Maximum: bodyParts.Stomach.max,
                    },
                },
                LeftArm: {
                    Health: {
                        Current: RandomUtil.getInt(
                            bodyParts.LeftArm.min,
                            bodyParts.LeftArm.max
                        ),
                        Maximum: bodyParts.LeftArm.max,
                    },
                },
                RightArm: {
                    Health: {
                        Current: RandomUtil.getInt(
                            bodyParts.RightArm.min,
                            bodyParts.RightArm.max
                        ),
                        Maximum: bodyParts.RightArm.max,
                    },
                },
                LeftLeg: {
                    Health: {
                        Current: RandomUtil.getInt(
                            bodyParts.LeftLeg.min,
                            bodyParts.LeftLeg.max
                        ),
                        Maximum: bodyParts.LeftLeg.max,
                    },
                },
                RightLeg: {
                    Health: {
                        Current: RandomUtil.getInt(
                            bodyParts.RightLeg.min,
                            bodyParts.RightLeg.max
                        ),
                        Maximum: bodyParts.RightLeg.max,
                    },
                },
            },
            UpdateTime: 0,
        };

        return newHealth;
    }

    static generateSkills(skillsObj)
    {
        const skills = [];
        const masteries = [];

        // skills
        if (skillsObj.Common)
        {
            for (const skillId in skillsObj.Common)
            {
                const skill = {
                    Id: skillId,
                    Progress: RandomUtil.getInt(
                        skillsObj.Common[skillId].min,
                        skillsObj.Common[skillId].max
                    ),
                };

                skills.push(skill);
            }
        }

        // masteries
        if (skillsObj.Mastering)
        {
            for (const masteringId in skillsObj.Mastering)
            {
                const mastery = {
                    Id: masteringId,
                    Progress: RandomUtil.getInt(
                        skillsObj.Mastering[masteringId].min,
                        skillsObj.Mastering[masteringId].max
                    ),
                };
                masteries.push(mastery);
            }
        }

        const skillsToReturn = {
            Common: skills,
            Mastering: masteries,
            Points: 0,
        };

        return skillsToReturn;
    }

    /**
     * Convert from pmc side (usec/bear) to the side as defined in the bot config (usecType/bearType)
     * @param pmcSide eft side (usec/bear)
     * @returns pmc side as defined in config
     */
    static getPmcRole(pmcSide)
    {
        if (pmcSide === "Usec")
        {
            return BotConfig.pmc.usecType;
        }

        if (pmcSide === "Bear")
        {
            return BotConfig.pmc.bearType;
        }
    }

    /**
     * Iterate through bots inventory and loot to find and remove christmas items (as defined in GameEventHelper)
     * @param nodeInventory Bots inventory to iterate over
     */
    static removeChristmasItemsFromBotInventory(nodeInventory)
    {
        const christmasItems = GameEventHelper.christmasEventItems;
        const locationsToFilter = [
            "FaceCover",
            "Headwear",
            "Backpack",
            "Pockets",
            "TacticalVest",
        ];
        for (const equipmentItem in nodeInventory.equipment)
        {
            if (!locationsToFilter.includes(equipmentItem))
            {
                continue;
            }

            const equipment = nodeInventory.equipment[equipmentItem];
            nodeInventory.equipment[equipmentItem] = Object.fromEntries(
                Object.entries(equipment).filter(
                    ([index, val]) => !christmasItems.includes(index)
                )
            );
        }

        for (const itemContainer in nodeInventory.items)
        {
            if (!locationsToFilter.includes(itemContainer))
            {
                continue;
            }

            const loot = nodeInventory.items[itemContainer];
            nodeInventory.items[itemContainer] = loot.filter(
                x => !christmasItems.includes(x)
            );
        }
    }

    static generateId(bot)
    {
        const botId = HashUtil.generate();

        bot._id = botId;
        bot.aid = botId;
        return bot;
    }

    static generateInventoryID(profile)
    {
        const defaultInventory = "55d7217a4bdc2d86028b456d";
        const itemsByParentHash = {};
        const inventoryItemHash = {};
        let inventoryId = "";

        // Generate inventoryItem list
        for (const item of profile.Inventory.items)
        {
            inventoryItemHash[item._id] = item;

            if (item._tpl === defaultInventory)
            {
                inventoryId = item._id;
                continue;
            }

            if (!("parentId" in item))
            {
                continue;
            }

            if (!(item.parentId in itemsByParentHash))
            {
                itemsByParentHash[item.parentId] = [];
            }

            itemsByParentHash[item.parentId].push(item);
        }

        // update inventoryId
        const newInventoryId = HashUtil.generate();
        inventoryItemHash[inventoryId]._id = newInventoryId;
        profile.Inventory.equipment = newInventoryId;

        // update inventoryItem id
        if (inventoryId in itemsByParentHash)
        {
            for (const item of itemsByParentHash[inventoryId])
            {
                item.parentId = newInventoryId;
            }
        }

        return profile;
    }

    static getPMCDifficulty(requestedDifficulty)
    {
        if (BotConfig.pmc.difficulty.toLowerCase() === "asonline")
        {
            return requestedDifficulty;
        }

        return BotConfig.pmc.difficulty;
    }

    /**
     * Add a side-specific (usec/bear) dogtag item to a bots inventory
     * @param bot bot to add dogtag to
     * @returns Bot with dogtag added
     */
    static generateDogtag(bot)
    {
        const upd = {
            SpawnedInSession: true,
            Dogtag: {
                AccountId: bot.aid,
                ProfileId: bot._id,
                Nickname: bot.Info.Nickname,
                Side: bot.Info.Side,
                Level: bot.Info.Level,
                Time: new Date().toISOString(),
                Status: "Killed by ",
                KillerAccountId: "Unknown",
                KillerProfileId: "Unknown",
                KillerName: "Unknown",
                WeaponName: "Unknown",
            },
        };

        const inventoryItem = {
            _id: HashUtil.generate(),
            _tpl:
                bot.Info.Side === "Usec"
                    ? BaseClasses.DOG_TAG_USEC
                    : BaseClasses.DOG_TAG_BEAR,
            parentId: bot.Inventory.equipment,
            slotId: "Dogtag",
            location: undefined,
            upd: upd,
        };

        bot.Inventory.items.push(inventoryItem);

        return bot;
    }
}

module.exports = BotGenerator;

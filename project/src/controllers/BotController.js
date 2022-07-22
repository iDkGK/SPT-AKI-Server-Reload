"use strict";

require("../Lib.js");

class BotController
{
    static getBotLimit(type)
    {
        return BotConfig.presetBatch[(type === "cursedAssault" || type === "assaultGroup") ? "assault" : type];
    }

    static getBotDifficulty(type, difficulty)
    {
        let difficultySettings;
        switch (type)
        {
            // requested difficulty shared among bots
            case "core":
                return DatabaseServer.tables.bots.core;
            case BotConfig.pmc.bearType:
                difficultySettings = BotController.getPmcDifficultySettings("bear", difficulty);
                BotController.randomisePmcHostility(difficultySettings);
                break;
            case BotConfig.pmc.usecType:
                difficultySettings = BotController.getPmcDifficultySettings("usec", difficulty);
                BotController.randomisePmcHostility(difficultySettings);
                break;
            // don't replace type
            default:
                difficultySettings = DatabaseServer.tables.bots.types[type].difficulty[difficulty];
                break;
        }

        return difficultySettings;
    }

    static getPmcDifficultySettings(type, difficulty)
    {
        const difficultySetting = BotConfig.pmc.difficulty.toLowerCase() === "asonline" ? difficulty : BotConfig.pmc.difficulty.toLowerCase();

        return DatabaseServer.tables.bots.types[type].difficulty[difficultySetting];
    }

    static randomisePmcHostility(difficultySettings)
    {
        if (RandomUtil.getInt(0, 99) < BotConfig.pmc.chanceSameSideIsHostilePercent)
        {
            difficultySettings.Mind.DEFAULT_ENEMY_USEC = true;
            difficultySettings.Mind.DEFAULT_ENEMY_BEAR = true;
        }
    }

    static generateId(bot)
    {
        const botId = HashUtil.generate();

        bot._id = botId;
        bot.aid = botId;
        return bot;
    }

    static generateBot(bot, role, isPmc)
    {
        // generate bot
        const node = DatabaseServer.tables.bots.types[role.toLowerCase()];

        const levelResult = BotController.generateRandomLevel(node.experience.level.min, node.experience.level.max);

        bot.Info.Nickname = `${RandomUtil.getArrayValue(node.firstName)} ${RandomUtil.getArrayValue(node.lastName) || ""}`;

        if (BotConfig.showTypeInNickname)
        {
            bot.Info.Nickname += ` ${role}`;
        }

        const skipChristmasItems = !GameEventHelper.christmasEventEnabled();
        if (skipChristmasItems)
        {
            BotController.removeChristmasItemsFromBotInventory(node.inventory);
        }

        bot.Info.Experience = levelResult.exp;
        bot.Info.Level = levelResult.level;
        bot.Info.Settings.Experience = RandomUtil.getInt(node.experience.reward.min, node.experience.reward.max);
        bot.Info.Settings.StandingForKill = node.experience.standingForKill;
        bot.Info.Voice = RandomUtil.getArrayValue(node.appearance.voice);
        bot.Health = BotController.generateHealth(node.health, bot.Info.Side === "Savage");
        bot.Skills = BotController.generateSkills(node.skills);
        bot.Customization.Head = RandomUtil.getArrayValue(node.appearance.head);
        bot.Customization.Body = RandomUtil.getArrayValue(node.appearance.body);
        bot.Customization.Feet = RandomUtil.getArrayValue(node.appearance.feet);
        bot.Customization.Hands = RandomUtil.getArrayValue(node.appearance.hands);
        bot.Inventory = BotGenerator.generateInventory(node.inventory, node.chances, node.generation, role, isPmc);

        if (BotController.isBotPmc(role))
        {
            bot = BotController.generateDogtag(bot);
        }

        // generate new bot ID
        bot = BotController.generateId(bot);

        // generate new inventory ID
        bot = InventoryHelper.generateInventoryID(bot);

        return bot;
    }

    static removeChristmasItemsFromBotInventory(nodeInventory)
    {
        const christmasItems = GameEventHelper.christmasEventItems;
        const locationsToFilter = ["FaceCover", "Headwear", "Backpack", "Pockets", "TacticalVest"];
        for (const equipmentItem in nodeInventory.equipment)
        {
            if (!locationsToFilter.includes(equipmentItem))
            {
                continue;
            }

            let equipment = nodeInventory.equipment[equipmentItem];
            equipment = Object.fromEntries(Object.entries(equipment).filter(([index, val])=>!christmasItems.includes(val)));
        }

        for (const itemContainer in nodeInventory.items)
        {
            if (!locationsToFilter.includes(itemContainer))
            {
                continue;
            }

            let loot = nodeInventory.items[itemContainer];
            loot = Object.fromEntries(Object.entries(loot).filter(([index, val])=>!christmasItems.includes(val)));
        }
    }

    static isBotPmc(botRole)
    {
        return (["usec", "bear"].includes(botRole.toLowerCase()));
    }

    static isBotBoss(botRole)
    {
        return BotConfig.bosses.some(x => x.toLowerCase() === botRole.toLowerCase());
    }

    static isBotFollower(botRole)
    {
        return botRole.toLowerCase().startsWith("follower");
    }

    static generate(info, playerScav = false)
    {
        const output = [];

        for (const condition of info.conditions)
        {
            for (let i = 0; i < condition.Limit; i++)
            {
                const pmcSide = (RandomUtil.getInt(0, 99) < BotConfig.pmc.isUsec) ? "Usec" : "Bear";
                let role = condition.Role;
                const isPmc = playerScav ? false : (role in BotConfig.pmc.types && RandomUtil.getInt(0, 99) < BotConfig.pmc.types[role]);
                let bot = JsonUtil.clone(DatabaseServer.tables.bots.base);

                bot.Info.Settings.BotDifficulty = (isPmc) ? this.getPMCDifficulty(condition.Difficulty) : condition.Difficulty;

                if (isPmc)
                {
                    // Set bot role to usec/bear so we can generate bot gear with corrisponding json
                    role = pmcSide;
                }

                bot.Info.Settings.Role = role;
                bot.Info.Side = (isPmc) ? pmcSide : "Savage";
                bot = BotController.generateBot(bot, role.toLowerCase(), isPmc);

                if (isPmc)
                {
                    // Get botRole back to its intended type
                    bot.Info.Settings.Role = BotController.getPmcRole(pmcSide);
                }

                output.unshift(bot);
            }
        }
        const pmcCount = output.reduce((acc, cur) => cur.Info.Side === "Bear" || cur.Info.Side === "Usec" ? ++acc : acc, 0);
        Logger.debug(`Generated ${output.length} total bots. Replaced ${pmcCount} with PMCs`);
        return output;
    }

    static getPMCDifficulty(requestedDifficulty)
    {
        if (BotConfig.pmc.difficulty.toLowerCase() === "asonline")
        {
            return requestedDifficulty;
        }

        return BotConfig.pmc.difficulty;
    }

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

    static generateRandomLevel(min, max)
    {
        const expTable = DatabaseServer.tables.globals.config.exp.level.exp_table;
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

    /** Converts health object to the required format */
    static generateHealth(healthObj, playerScav = false)
    {
        const bodyParts = (playerScav) ? healthObj.BodyParts[0] : RandomUtil.getArrayValue(healthObj.BodyParts);

        return {
            "Hydration": {
                "Current": RandomUtil.getInt(healthObj.Hydration.min, healthObj.Hydration.max),
                "Maximum": healthObj.Hydration.max
            },
            "Energy": {
                "Current": RandomUtil.getInt(healthObj.Energy.min, healthObj.Energy.max),
                "Maximum": healthObj.Energy.max
            },
            "Temperature": {
                "Current": RandomUtil.getInt(healthObj.Temperature.min, healthObj.Temperature.max),
                "Maximum": healthObj.Temperature.max
            },
            "BodyParts": {
                "Head": {
                    "Health": {
                        "Current": RandomUtil.getInt(bodyParts.Head.min, bodyParts.Head.max),
                        "Maximum": bodyParts.Head.max
                    }
                },
                "Chest": {
                    "Health": {
                        "Current": RandomUtil.getInt(bodyParts.Chest.min, bodyParts.Chest.max),
                        "Maximum": bodyParts.Chest.max
                    }
                },
                "Stomach": {
                    "Health": {
                        "Current": RandomUtil.getInt(bodyParts.Stomach.min, bodyParts.Stomach.max),
                        "Maximum": bodyParts.Stomach.max
                    }
                },
                "LeftArm": {
                    "Health": {
                        "Current": RandomUtil.getInt(bodyParts.LeftArm.min, bodyParts.LeftArm.max),
                        "Maximum": bodyParts.LeftArm.max
                    }
                },
                "RightArm": {
                    "Health": {
                        "Current": RandomUtil.getInt(bodyParts.RightArm.min, bodyParts.RightArm.max),
                        "Maximum": bodyParts.RightArm.max
                    }
                },
                "LeftLeg": {
                    "Health": {
                        "Current": RandomUtil.getInt(bodyParts.LeftLeg.min, bodyParts.LeftLeg.max),
                        "Maximum": bodyParts.LeftLeg.max
                    }
                },
                "RightLeg": {
                    "Health": {
                        "Current": RandomUtil.getInt(bodyParts.RightLeg.min, bodyParts.RightLeg.max),
                        "Maximum": bodyParts.RightLeg.max
                    }
                }
            }
        };
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
                skills.push({
                    "Id": skillId,
                    "Progress": RandomUtil.getInt(skillsObj.Common[skillId].min, skillsObj.Common[skillId].max),
                });
            }
        }

        // masteries
        if (skillsObj.Mastering)
        {
            for (const masteringId in skillsObj.Mastering)
            {
                masteries.push({
                    "Id": masteringId,
                    "Progress": RandomUtil.getInt(skillsObj.Mastering[masteringId].min, skillsObj.Mastering[masteringId].max)
                });
            }
        }

        return {
            "Common": skills,
            "Mastering": masteries,
            "Points": 0
        };
    }

    static generateDogtag(bot)
    {
        bot.Inventory.items.push({
            _id: HashUtil.generate(),
            _tpl: ((bot.Info.Side === "Usec") ? ItemHelper.BASECLASS.DogTagUsec : ItemHelper.BASECLASS.DogTagBear),
            parentId: bot.Inventory.equipment,
            slotId: "Dogtag",
            upd: {
                "Dogtag": {
                    "AccountId": bot.aid,
                    "ProfileId": bot._id,
                    "Nickname": bot.Info.Nickname,
                    "Side": bot.Info.Side,
                    "Level": bot.Info.Level,
                    "Time": (new Date().toISOString()),
                    "Status": "Killed by ",
                    "KillerAccountId": "Unknown",
                    "KillerProfileId": "Unknown",
                    "KillerName": "Unknown",
                    "WeaponName": "Unknown"
                },
                "SpawnedInSession": true
            }
        });

        return bot;
    }

    static getBotCap()
    {
        return BotConfig.maxBotCap;
    }
}

module.exports = BotController;

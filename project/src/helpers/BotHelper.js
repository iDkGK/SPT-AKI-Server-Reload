"use strict";

require("../Lib.js");

class BotHelper
{
    static getBotDifficultySettings(type, difficulty)
    {
        const bot = DatabaseServer.getTables().bots.types[type];
        if (!bot)
        {
            // get fallback
            Logger.warning(
                `Unable to find difficulty for bot: ${type} difficulty: ${difficulty}, using assault`
            );
            DatabaseServer.getTables().bots.types[type] = JsonUtil.clone(
                DatabaseServer.getTables().bots.types.assault
            );
        }

        return DatabaseServer.getTables().bots.types[type].difficulty[
            difficulty
        ];
    }

    static getBotTemplate(role)
    {
        return DatabaseServer.getTables().bots.types[role.toLowerCase()];
    }

    static getPmcDifficultySettings(type, difficulty)
    {
        const difficultySetting =
            BotConfig.pmc.difficulty.toLowerCase() === "asonline"
                ? difficulty
                : BotConfig.pmc.difficulty.toLowerCase();

        return JsonUtil.clone(
            DatabaseServer.getTables().bots.types[type].difficulty[
                difficultySetting
            ]
        );
    }

    /**
     * Randomise the chance the PMC will attack their own side
     * @param difficultySettings pmc difficulty settings
     */
    static randomisePmcHostility(difficultySettings)
    {
        if (
            RandomUtil.getInt(0, 99) <
            BotConfig.pmc.chanceSameSideIsHostilePercent
        )
        {
            difficultySettings.Mind.DEFAULT_USEC_BEHAVIOUR = "Attack";
            difficultySettings.Mind.DEFAULT_BEAR_BEHAVIOUR = "Attack";
        }
    }

    static isBotPmc(botRole)
    {
        return ["usec", "bear"].includes(botRole.toLowerCase());
    }

    static isBotBoss(botRole)
    {
        return BotConfig.bosses.some(
            x => x.toLowerCase() === botRole.toLowerCase()
        );
    }

    static isBotFollower(botRole)
    {
        return botRole.toLowerCase().startsWith("follower");
    }

    /**
     * Add a bot to the FRIENDLY_BOT_TYPES array
     * @param difficultySettings bot settings to alter
     * @param typeToAdd bot type to add to friendly list
     */
    static addBotToFriendlyList(difficultySettings, typeToAdd)
    {
        const friendlyBotTypesKey = "FRIENDLY_BOT_TYPES";

        // Null guard
        if (!difficultySettings.Mind[friendlyBotTypesKey])
        {
            difficultySettings.Mind[friendlyBotTypesKey] = [];
        }

        difficultySettings.Mind[friendlyBotTypesKey].push(typeToAdd);
    }

    /**
     * Add a bot to the ENEMY_BOT_TYPES array
     * @param difficultySettings bot settings to alter
     * @param typesToAdd bot type to add to enemy list
     */
    static addBotToEnemyList(difficultySettings, typesToAdd, typeBeingEdited)
    {
        const enemyBotTypesKey = "ENEMY_BOT_TYPES";

        // Null guard
        if (!difficultySettings.Mind[enemyBotTypesKey])
        {
            difficultySettings.Mind[enemyBotTypesKey] = [];
        }

        const enemyArray = difficultySettings.Mind[enemyBotTypesKey];
        for (const botTypeToAdd of typesToAdd)
        {
            if (botTypeToAdd.toLowerCase() === typeBeingEdited.toLowerCase())
            {
                Logger.warning(
                    `unable to add enemy ${botTypeToAdd} to its own enemy list, skipping`
                );
                continue;
            }

            if (!enemyArray.includes(botTypeToAdd))
            {
                enemyArray.push(botTypeToAdd);
            }
        }
    }

    /**
     * Add a bot to the REVENGE_BOT_TYPES array
     * @param difficultySettings bot settings to alter
     * @param typesToAdd bot type to add to revenge list
     */
    static addBotToRevengeList(difficultySettings, typesToAdd)
    {
        const revengPropKey = "REVENGE_BOT_TYPES";

        // Nothing to add
        if (!typesToAdd)
        {
            return;
        }

        // Null guard
        if (!difficultySettings.Mind[revengPropKey])
        {
            difficultySettings.Mind[revengPropKey] = [];
        }

        const revengeArray = difficultySettings.Mind[revengPropKey];
        for (const botTypeToAdd of typesToAdd)
        {
            if (!revengeArray.includes(botTypeToAdd))
            {
                revengeArray.push(botTypeToAdd);
            }
        }
    }
}

module.exports = BotHelper;

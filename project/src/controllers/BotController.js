"use strict";

require("../Lib.js");

class BotController
{
    /**
     * Return the number of bot loadout varieties to be generated
     * @param type bot Type we want the loadout gen count for
     * @returns
     */
    static getBotPresetGenerationLimit(type)
    {
        return BotConfig.presetBatch[
            type === "cursedAssault" || type === "assaultGroup"
                ? "assault"
                : type
        ];
    }

    static getBotCoreDifficulty()
    {
        return DatabaseServer.getTables().bots.core;
    }

    /**
     * Get bot difficulty settings
     * adjust PMC settings to ensure they engage the correct bot types
     * @param type what bot the server is requesting settings for
     * @param difficulty difficulty level server requested settings for
     * @returns Difficulty object
     */
    static getBotDifficulty(type, difficulty)
    {
        let difficultySettings;
        const lowercasedType = type.toLowerCase();
        switch (type.toLowerCase())
        {
            case BotConfig.pmc.bearType.toLowerCase():
                difficultySettings = BotController.getPmcDifficultySettings(
                    "bear",
                    difficulty
                );
                break;
            case BotConfig.pmc.usecType.toLowerCase():
                difficultySettings = BotController.getPmcDifficultySettings(
                    "usec",
                    difficulty
                );
                break;
            default:
                difficultySettings = BotHelper.getBotDifficultySettings(
                    type,
                    difficulty
                );
                BotHelper.addBotToEnemyList(
                    difficultySettings,
                    [BotConfig.pmc.bearType, BotConfig.pmc.usecType],
                    lowercasedType
                );
                break;
        }

        return difficultySettings;
    }

    static getPmcDifficultySettings(pmcType, difficulty)
    {
        const difficultySettings = BotHelper.getPmcDifficultySettings(
            pmcType,
            difficulty
        );

        const friendlyType =
            pmcType === "bear"
                ? BotConfig.pmc.bearType
                : BotConfig.pmc.usecType;
        const enemyType =
            pmcType === "bear"
                ? BotConfig.pmc.usecType
                : BotConfig.pmc.bearType;

        BotHelper.addBotToEnemyList(difficultySettings, [friendlyType], ""); // Add self type to enemy list
        BotHelper.addBotToEnemyList(
            difficultySettings,
            BotConfig.pmc.enemyTypes,
            pmcType
        );
        BotHelper.addBotToEnemyList(difficultySettings, [enemyType], pmcType);

        BotHelper.randomisePmcHostility(difficultySettings);

        return difficultySettings;
    }

    static generate(sessionId, info)
    {
        return BotGenerator.generate(sessionId, info);
    }

    static getBotCap()
    {
        return BotConfig.maxBotCap;
    }
}

module.exports = BotController;

"use strict";

require("../Lib.js");

class PlayerScavGenerator
{
    /**
     * Update a player profile to include a new player scav profile
     * @param sessionID session id to specify what profile is updated
     * @returns profile object
     */
    static generate(sessionID)
    {
        // get karma level from profile
        const profile = SaveServer.getProfile(sessionID);
        const pmcData = profile.characters.pmc;
        const existingScavData = profile.characters.scav;
        const scavKarmaLevel = PlayerScavGenerator.getScavKarmaLevel(pmcData);

        // use karma level to get correct karmaSettings
        const playerScavKarmaSettings =
            PlayerScavConfig.karmaLevel[scavKarmaLevel];

        if (!playerScavKarmaSettings)
        {
            Logger.error(
                `unable to acquire karma settings for level ${scavKarmaLevel}`
            );
        }

        Logger.debug(
            `generating player scav loadout with karma level ${scavKarmaLevel}`
        );

        // edit baseBotNode values
        const baseBotNode = PlayerScavGenerator.constructBotBaseTemplate(
            playerScavKarmaSettings.botTypeForLoot
        );
        PlayerScavGenerator.adjustBotTemplateWithKarmaSpecificSettings(
            playerScavKarmaSettings,
            baseBotNode
        );

        let scavData = BotGenerator.generatePlayerScav(
            playerScavKarmaSettings.botTypeForLoot.toLowerCase(),
            "easy",
            baseBotNode
        );
        BotLootCacheService.clearCache();

        // add scav metadata
        scavData._id = pmcData.savage;
        scavData.aid = sessionID;
        scavData.Info.Settings = {};
        scavData.TradersInfo = JsonUtil.clone(pmcData.TradersInfo);
        scavData.Skills = PlayerScavGenerator.getScavSkills(existingScavData);
        scavData.Stats = PlayerScavGenerator.getScavStats(existingScavData);
        scavData.Info.Level =
            PlayerScavGenerator.getScavLevel(existingScavData);
        scavData.Info.Experience =
            PlayerScavGenerator.getScavExperience(existingScavData);

        // remove secure container
        scavData = ProfileHelper.removeSecureContainer(scavData);

        // set cooldown timer
        scavData = PlayerScavGenerator.setScavCooldownTimer(scavData, pmcData);

        // add scav to the profile
        SaveServer.getProfile(sessionID).characters.scav = scavData;

        return scavData;
    }

    /**
     * Get the scav karama level for a profile
     * Is also the fence trader rep level
     * @param pmcData pmc profile
     * @returns karma level
     */
    static getScavKarmaLevel(pmcData)
    {
        const fenceInfo = pmcData.TradersInfo[Traders.FENCE];

        // Can be empty during profile creation
        if (!fenceInfo)
        {
            Logger.warning(
                "getScavKarmaLevel() failed, unable to find fence in profile.traderInfo. Defaulting to 0"
            );
            return 0;
        }

        // e.g. 2.09 becomes 2
        return Math.floor(fenceInfo.standing);
    }

    /**
     * Get a baseBot template
     * If the parameter doesnt match "assault", take parts from the loot type and apply to the return bot template
     * @param botTypeForLoot bot type to use for inventory/chances
     * @returns IBotType object
     */
    static constructBotBaseTemplate(botTypeForLoot)
    {
        const baseScavType = "assault";
        const assaultBase = JsonUtil.clone(
            BotHelper.getBotTemplate(baseScavType)
        );

        // Loot bot is same as base bot, return base with no modification
        if (botTypeForLoot === baseScavType)
        {
            return assaultBase;
        }

        const lootBase = JsonUtil.clone(
            BotHelper.getBotTemplate(botTypeForLoot)
        );
        assaultBase.inventory = lootBase.inventory;
        assaultBase.chances = lootBase.chances;
        assaultBase.generation = lootBase.generation;

        return assaultBase;
    }

    /**
     * Adjust equipment/mod/item generation values based on scav karma levels
     * @param karmaSettings Values to modify the bot template with
     * @param baseBotNode bot template to modify according to karama level settings
     */
    static adjustBotTemplateWithKarmaSpecificSettings(
        karmaSettings,
        baseBotNode
    )
    {
        // Adjust equipment chance values
        for (const equipmentKey in karmaSettings.modifiers.equipment)
        {
            if (karmaSettings.modifiers.equipment[equipmentKey] === 0)
            {
                continue;
            }

            baseBotNode.chances.equipment[equipmentKey] +=
                karmaSettings.modifiers.equipment[equipmentKey];
        }

        // Adjust mod chance values
        for (const modKey in karmaSettings.modifiers.mod)
        {
            if (karmaSettings.modifiers.mod[modKey] === 0)
            {
                continue;
            }

            baseBotNode.chances.mods[modKey] +=
                karmaSettings.modifiers.mod[modKey];
        }

        // Adjust item spawn quantity values
        for (const itemLimitkey in karmaSettings.itemLimits)
        {
            baseBotNode.generation.items[itemLimitkey].min =
                karmaSettings.itemLimits[itemLimitkey].min;
            baseBotNode.generation.items[itemLimitkey].max =
                karmaSettings.itemLimits[itemLimitkey].max;
        }

        // Blacklist equipment
        for (const equipmentKey in karmaSettings.equipmentBlacklist)
        {
            const blacklistedItemTpls =
                karmaSettings.equipmentBlacklist[equipmentKey];
            for (const itemToRemove of blacklistedItemTpls)
            {
                delete baseBotNode.inventory.equipment[equipmentKey][
                    itemToRemove
                ];
            }
        }
    }

    static getScavSkills(scavProfile)
    {
        if (scavProfile.Skills)
        {
            return scavProfile.Skills;
        }

        return PlayerScavGenerator.getDefaultScavSkills();
    }

    static getDefaultScavSkills()
    {
        return {
            Common: [],
            Mastering: [],
            Bonuses: undefined,
            Points: 0,
        };
    }

    static getScavStats(scavProfile)
    {
        if (scavProfile.Stats)
        {
            return scavProfile.Stats;
        }

        return ProfileHelper.getDefaultCounters();
    }

    static getScavLevel(scavProfile)
    {
        // Info can be null on initial account creation
        if (!scavProfile.Info || !scavProfile.Info.Level)
        {
            return 1;
        }

        return scavProfile.Info.Level;
    }

    static getScavExperience(scavProfile)
    {
        // Info can be null on initial account creation
        if (!scavProfile.Info || !scavProfile.Info.Experience)
        {
            return 0;
        }

        return scavProfile.Info.Experience;
    }

    /**
     * Set cooldown till pscav is playable
     * take into account scav cooldown bonus
     * @param scavData scav profile
     * @param pmcData pmc profile
     * @returns
     */
    static setScavCooldownTimer(scavData, pmcData)
    {
        // Set cooldown time.
        // Make sure to apply ScavCooldownTimer bonus from Hideout if the player has it.
        let scavLockDuration =
            DatabaseServer.getTables().globals.config.SavagePlayCooldown;
        let modifier = 1;

        for (const bonus of pmcData.Bonuses)
        {
            if (bonus.type === "ScavCooldownTimer")
            {
                // Value is negative, so add.
                // Also note that for scav cooldown, multiple bonuses stack additively.
                modifier += bonus.value / 100;
            }
        }

        const fenceInfo = FenceService.getFenceInfo(pmcData);
        modifier *= fenceInfo.SavageCooldownModifier;

        scavLockDuration *= modifier;
        scavData.Info.SavageLockTime = Date.now() / 1000 + scavLockDuration;

        return scavData;
    }
}

module.exports = PlayerScavGenerator;

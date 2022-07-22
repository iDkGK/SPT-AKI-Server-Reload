"use strict";

require("../Lib.js");

class DurabilityLimitsHelper
{
    static getRandomisedMaxWeaponDurability(itemTemplate, botRole)
    {
        if (botRole && BotController.isBotPmc(botRole))
        {
            return DurabilityLimitsHelper.generateMaxWeaponDurability("pmc");
        }

        if (botRole && BotController.isBotBoss(botRole))
        {
            return DurabilityLimitsHelper.generateMaxWeaponDurability("boss");
        }

        if (botRole && BotController.isBotFollower(botRole))
        {
            return DurabilityLimitsHelper.generateMaxWeaponDurability("follower");
        }

        return DurabilityLimitsHelper.generateMaxWeaponDurability(botRole);
    }

    static getRandomisedMaxArmorDurability(itemTemplate, botRole)
    {
        const itemMaxDurability = itemTemplate._props.MaxDurability;

        if (botRole && BotController.isBotPmc(botRole))
        {
            return DurabilityLimitsHelper.generateMaxPmcArmorDurability(itemMaxDurability);
        }

        if (botRole && BotController.isBotBoss(botRole))
        {
            return itemMaxDurability;
        }

        if (botRole && BotController.isBotFollower(botRole))
        {
            return itemMaxDurability;
        }

        return itemMaxDurability;
    }

    static getRandomisedWeaponDurability(itemTemplate, botRole, maxDurability)
    {
        if (botRole && (BotController.isBotPmc(botRole)))
        {
            return DurabilityLimitsHelper.generateWeaponDurability("pmc", maxDurability);
        }

        if (botRole && BotController.isBotBoss(botRole))
        {
            return DurabilityLimitsHelper.generateWeaponDurability("boss", maxDurability);
        }

        if (botRole && BotController.isBotFollower(botRole))
        {
            return DurabilityLimitsHelper.generateWeaponDurability("follower", maxDurability);
        }

        return DurabilityLimitsHelper.generateWeaponDurability(botRole, maxDurability);
    }

    static getRandomisedArmorDurability(itemTemplate, botRole, maxDurability)
    {
        if (botRole && (BotController.isBotPmc(botRole)))
        {
            return DurabilityLimitsHelper.generateArmorDurability("pmc", maxDurability);
        }

        if (botRole && BotController.isBotBoss(botRole))
        {
            return DurabilityLimitsHelper.generateArmorDurability("boss", maxDurability);
        }

        if (botRole && BotController.isBotFollower(botRole))
        {
            return DurabilityLimitsHelper.generateArmorDurability("follower", maxDurability);
        }

        return DurabilityLimitsHelper.generateArmorDurability(botRole, maxDurability);
    }

    static generateMaxWeaponDurability(botRole)
    {
        const lowestMax = DurabilityLimitsHelper.getLowestMaxWeaponFromConfig(botRole);
        const highestMax = DurabilityLimitsHelper.getHighestMaxWeaponDurabilityFromConfig(botRole);

        return RandomUtil.getInt(lowestMax, highestMax);
    }

    static generateMaxPmcArmorDurability(itemMaxDurability)
    {
        const lowestMaxPercent = BotConfig.durability["pmc"].armor.lowestMaxPercent;
        const highestMaxPercent = BotConfig.durability["pmc"].armor.highestMaxPercent;
        const multiplier = RandomUtil.getInt(lowestMaxPercent, highestMaxPercent);

        return itemMaxDurability * (multiplier / 100);
    }

    static getLowestMaxWeaponFromConfig(botRole)
    {
        if (BotConfig.durability[botRole])
        {
            return BotConfig.durability[botRole].weapon.lowestMax;
        }

        return BotConfig.durability.default.weapon.lowestMax;
    }

    static getHighestMaxWeaponDurabilityFromConfig(botRole)
    {
        if (BotConfig.durability[botRole])
        {
            return BotConfig.durability[botRole].weapon.highestMax;
        }

        return BotConfig.durability.default.weapon.highestMax;
    }

    static generateWeaponDurability(botRole, maxDurability)
    {
        const minDelta = DurabilityLimitsHelper.getMinWeaponDeltaFromConfig(botRole);
        const maxDelta = DurabilityLimitsHelper.getMaxWeaponDeltaFromConfig(botRole);
        const delta = RandomUtil.getInt(minDelta, maxDelta);

        return maxDurability - delta;
    }

    static generateArmorDurability(botRole, maxDurability)
    {
        const minDelta = DurabilityLimitsHelper.getMinArmorDeltaFromConfig(botRole);
        const maxDelta = DurabilityLimitsHelper.getMaxArmorDeltaFromConfig(botRole);
        const delta = RandomUtil.getInt(minDelta, maxDelta);

        return maxDurability - delta;
    }

    static getMinWeaponDeltaFromConfig(botRole)
    {
        if (BotConfig.durability[botRole])
        {
            return BotConfig.durability[botRole].weapon.minDelta;
        }

        return BotConfig.durability.default.weapon.minDelta;
    }

    static getMaxWeaponDeltaFromConfig(botRole)
    {
        if (BotConfig.durability[botRole])
        {
            return BotConfig.durability[botRole].weapon.maxDelta;
        }

        return BotConfig.durability.default.weapon.maxDelta;
    }

    static getMinArmorDeltaFromConfig(botRole)
    {
        if (BotConfig.durability[botRole])
        {
            return BotConfig.durability[botRole].armor.minDelta;
        }

        return BotConfig.durability.default.armor.minDelta;
    }

    static getMaxArmorDeltaFromConfig(botRole)
    {
        if (BotConfig.durability[botRole])
        {
            return BotConfig.durability[botRole].armor.maxDelta;
        }

        return BotConfig.durability.default.armor.maxDelta;
    }
}

module.exports = DurabilityLimitsHelper;
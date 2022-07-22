"use strict";

class RagfairServerHelper
{
    static isItemValidRagfairItem(itemDetails)
    {
        const blacklistConfig = RagfairConfig.dynamic.blacklist;

        // Skip invalid items
        if (!itemDetails[0])
        {
            return false;
        }

        // Skip bsg blacklisted items
        if (blacklistConfig.enableBsgList && !itemDetails[1]._props.CanSellOnRagfair)
        {
            return false;
        }

        // Skip custom blacklisted items
        if (RagfairServerHelper.isItemBlacklisted(itemDetails[1]._id))
        {
            return false;
        }

        // Skip quest items
        if (blacklistConfig.enableQuestList && ItemHelper.isQuestItem(itemDetails[1]._id))
        {
            return false;
        }

        return true;
    }

    static isItemBlacklisted(itemTemplateId)
    {
        if (!ItemHelper.isValidItem(itemTemplateId))
        {
            return true;
        }

        return RagfairConfig.dynamic.blacklist.custom.includes(itemTemplateId);
    }

    static isTrader(userID)
    {
        return userID in DatabaseServer.tables.traders;
    }

    static isPlayer(userID)
    {
        if (ProfileController.getPmcProfile(userID) !== undefined)
        {
            return true;
        }
        return false;
    }

    static CalculateDynamicStackCount(tplId, isWeaponPreset)
    {
        const config = RagfairConfig.dynamic;

        // Lookup item details - check if item not found
        const itemDetails = ItemHelper.getItem(tplId);
        if (!itemDetails[0])
        {
            throw new Error(`Item with tpl ${tplId} not found. Unable to generate a dynamic stack count.`);
        }

        // Item Types to return one of
        if (isWeaponPreset || ItemHelper.doesItemOrParentsIdMatch(itemDetails[1]._id, RagfairConfig.dynamic.showAsSingleStack))
        {
            return 1;
        }

        // Get max stack count
        const maxStackCount = itemDetails[1]._props.StackMaxSize;

        // non-stackable - use differnt values to calcualte stack size
        if (!maxStackCount || maxStackCount === 1)
        {
            return Math.round(RandomUtil.getInt(config.nonStackableCount.min, config.nonStackableCount.max));
        }

        const stackPercent = Math.round(RandomUtil.getInt(config.stackablePercent.min, config.stackablePercent.max));

        return Math.round((maxStackCount / 100) * stackPercent);
    }

    static getDynamicOfferCurrency()
    {
        const currencies = RagfairConfig.dynamic.currencies;
        const bias = [];

        for (const item in currencies)
        {
            for (let i = 0; i < currencies[item]; i++)
            {
                bias.push(item);
            }
        }

        return bias[Math.floor(Math.random() * bias.length)];
    }

    static getMemberType(userID)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            // player offer
            return SaveServer.profiles[userID].characters.pmc.Info.AccountType;
        }

        if (RagfairServerHelper.isTrader(userID))
        {
            // trader offer
            return 4;
        }

        // generated offer
        return 0;
    }

    static getNickname(userID)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            // player offer
            return SaveServer.profiles[userID].characters.pmc.Info.Nickname;
        }

        if (RagfairServerHelper.isTrader(userID))
        {
            // trader offer
            return DatabaseServer.tables.traders[userID].base.nickname;
        }

        // generated offer
        // recurse if name is longer than max characters allowed (15 characters)
        const type = (RandomUtil.getInt(0, 1) === 0) ? "usec" : "bear";
        const name = RandomUtil.getArrayValue(DatabaseServer.tables.bots.types[type].firstName);
        return (name.length > 15) ? RagfairServerHelper.getNickname(userID) : name;
    }
}

module.exports = RagfairServerHelper;
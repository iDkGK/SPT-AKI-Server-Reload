"use strict";

class RagfairServerHelper
{
    static get goodsReturnedTemplate()
    {
        return "5bdac06e86f774296f5a19c5";
    }

    /**
     * Is item valid / on blacklist / quest item
     * @param itemDetails
     * @returns boolean
     */
    static isItemValidRagfairItem(itemDetails)
    {
        const blacklistConfig = RagfairConfig.dynamic.blacklist;

        // Skip invalid items
        if (!itemDetails[0])
        {
            return false;
        }

        // Skip bsg blacklisted items
        if (
            blacklistConfig.enableBsgList &&
            !itemDetails[1]._props.CanSellOnRagfair
        )
        {
            return false;
        }

        // Skip custom blacklisted items
        if (RagfairServerHelper.isItemBlacklisted(itemDetails[1]._id))
        {
            return false;
        }

        // Skip quest items
        if (
            blacklistConfig.enableQuestList &&
            ItemHelper.isQuestItem(itemDetails[1]._id)
        )
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
        return userID in DatabaseServer.getTables().traders;
    }

    static isPlayer(userID)
    {
        if (ProfileHelper.getPmcProfile(userID) !== undefined)
        {
            return true;
        }
        return false;
    }

    static returnItems(sessionID, items)
    {
        const messageContent = DialogueHelper.createMessageContext(
            undefined,
            MessageType.MESSAGE_WITH_ITEMS,
            QuestConfig.redeemTime
        );
        messageContent.text =
            DatabaseServer.getTables().locales.global[
                LocaleService.getDesiredLocale()
            ].mail[RagfairServerHelper.goodsReturnedTemplate];

        DialogueHelper.addDialogueMessage(
            Traders.RAGMAN,
            messageContent,
            sessionID,
            items
        );
    }

    static calculateDynamicStackCount(tplId, isWeaponPreset)
    {
        const config = RagfairConfig.dynamic;

        // Lookup item details - check if item not found
        const itemDetails = ItemHelper.getItem(tplId);
        if (!itemDetails[0])
        {
            throw new Error(
                `Item with tpl ${tplId} not found. Unable to generate a dynamic stack count.`
            );
        }

        // Item Types to return one of
        if (
            isWeaponPreset ||
            ItemHelper.doesItemOrParentsIdMatch(
                itemDetails[1]._id,
                RagfairConfig.dynamic.showAsSingleStack
            )
        )
        {
            return 1;
        }

        // Get max stack count
        const maxStackCount = itemDetails[1]._props.StackMaxSize;

        // non-stackable - use differnt values to calcualte stack size
        if (!maxStackCount || maxStackCount === 1)
        {
            return Math.round(
                RandomUtil.getInt(
                    config.nonStackableCount.min,
                    config.nonStackableCount.max
                )
            );
        }

        const stackPercent = Math.round(
            RandomUtil.getInt(
                config.stackablePercent.min,
                config.stackablePercent.max
            )
        );

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
            return SaveServer.getProfile(userID).characters.pmc.Info
                .AccountType;
        }

        if (RagfairServerHelper.isTrader(userID))
        {
            // trader offer
            return MemberCategory.TRADER;
        }

        // generated offer
        return MemberCategory.DEFAULT;
    }

    static getNickname(userID)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            // player offer
            return SaveServer.getProfile(userID).characters.pmc.Info.Nickname;
        }

        if (RagfairServerHelper.isTrader(userID))
        {
            // trader offer
            return DatabaseServer.getTables().traders[userID].base.nickname;
        }

        // generated offer
        // recurse if name is longer than max characters allowed (15 characters)
        const type = RandomUtil.getInt(0, 1) === 0 ? "usec" : "bear";
        const name = RandomUtil.getStringArrayValue(
            DatabaseServer.getTables().bots.types[type].firstName
        );
        return name.length > 15
            ? RagfairServerHelper.getNickname(userID)
            : name;
    }

    static getPresetItems(item)
    {
        const preset = JsonUtil.clone(
            DatabaseServer.getTables().globals.ItemPresets[item._id]._items
        );
        return RagfairServerHelper.reparentPresets(item, preset);
    }

    static getPresetItemsByTpl(item)
    {
        const presets = [];

        for (const itemId in DatabaseServer.getTables().globals.ItemPresets)
        {
            if (
                DatabaseServer.getTables().globals.ItemPresets[itemId]._items[0]
                    ._tpl === item._tpl
            )
            {
                const presetItems = JsonUtil.clone(
                    DatabaseServer.getTables().globals.ItemPresets[itemId]
                        ._items
                );
                presets.push(
                    RagfairServerHelper.reparentPresets(item, presetItems)
                );
            }
        }

        return presets;
    }

    static reparentPresets(item, preset)
    {
        const oldRootId = preset[0]._id;
        const idMappings = {};

        idMappings[oldRootId] = item._id;

        for (const mod of preset)
        {
            if (idMappings[mod._id] === undefined)
            {
                idMappings[mod._id] = HashUtil.generate();
            }

            if (
                mod.parentId !== undefined &&
                idMappings[mod.parentId] === undefined
            )
            {
                idMappings[mod.parentId] = HashUtil.generate();
            }

            mod._id = idMappings[mod._id];

            if (mod.parentId !== undefined)
            {
                mod.parentId = idMappings[mod.parentId];
            }
        }

        // force item's details into first location of presetItems
        preset[0] = item;

        return preset;
    }
}

module.exports = RagfairServerHelper;

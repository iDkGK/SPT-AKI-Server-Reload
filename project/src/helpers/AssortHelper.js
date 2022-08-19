"use strict";

require("../Lib.js");

class AssortHelper
{
    /**
     * Remove assorts from a trader that have not been unlocked yet
     * @param pmcProfile player profile
     * @param traderId traders id
     * @param assort assort items from a trader
     * @returns assort items minus locked quest assorts
     */
    static stripLockedQuestAssort(pmcProfile, traderId, assort)
    {
        // Trader assort does not always contain loyal_level_items
        if (!assort.loyal_level_items)
        {
            Logger.warning(
                `stripQuestAssort: Assort for Trader ${traderId} does't contain "loyal_level_items, skipping removal of quest assorts"`
            );
            return assort;
        }

        const questassort =
            DatabaseServer.getTables().traders[traderId].questassort;
        if (!questassort)
        {
            Logger.warning(
                `stripQuestAssort: Assort for Trader ${traderId} does't contain a questassort json, skipping removal of quest assorts`
            );
            return assort;
        }

        for (const assortId in assort.loyal_level_items)
        {
            if (
                assortId in questassort.started &&
                QuestHelper.questStatus(
                    pmcProfile,
                    questassort.started[assortId]
                ) !== QuestStatus.Started
            )
            {
                assort = AssortHelper.removeItemFromAssort(assort, assortId);
            }

            if (
                assortId in questassort.success &&
                QuestHelper.questStatus(
                    pmcProfile,
                    questassort.success[assortId]
                ) !== QuestStatus.Success
            )
            {
                assort = AssortHelper.removeItemFromAssort(assort, assortId);
            }

            if (
                assortId in questassort.fail &&
                QuestHelper.questStatus(
                    pmcProfile,
                    questassort.fail[assortId]
                ) !== QuestStatus.Fail
            )
            {
                assort = AssortHelper.removeItemFromAssort(assort, assortId);
            }
        }

        return assort;
    }

    /**
     * Remove assorts from a trader that have not been unlocked yet
     * @param pmcProfile player profile
     * @param traderId traders id
     * @param assort traders assorts
     * @returns traders assorts minus locked loyality assorts
     */
    static stripLockedLoyaltyAssort(pmcProfile, traderId, assort)
    {
        // Trader assort does not always contain loyal_level_items
        if (!assort.loyal_level_items)
        {
            Logger.warning(
                `stripQuestAssort: Assort for Trader ${traderId} does't contain "loyal_level_items"`
            );
            return assort;
        }

        for (const itemId in assort.loyal_level_items)
        {
            if (
                assort.loyal_level_items[itemId] >
                pmcProfile.TradersInfo[traderId].loyaltyLevel
            )
            {
                assort = AssortHelper.removeItemFromAssort(assort, itemId);
            }
        }

        return assort;
    }

    /**
     * Remove an item from an assort
     * @param assort assort to modify
     * @param itemID item id to remove from asort
     * @returns Modified assort
     */
    static removeItemFromAssort(assort, itemID)
    {
        const idsToRemove = ItemHelper.findAndReturnChildrenByItems(
            assort.items,
            itemID
        );

        delete assort.barter_scheme[itemID];
        delete assort.loyal_level_items[itemID];

        for (const i in idsToRemove)
        {
            for (const a in assort.items)
            {
                if (assort.items[a]._id === idsToRemove[i])
                {
                    assort.items.splice(parseInt(a), 1);
                }
            }
        }

        return assort;
    }
}

module.exports = AssortHelper;

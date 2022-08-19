"use strict";

require("../Lib.js");

class ScavCaseRewardGenerator
{
    /**
     * Create an array of rewards that will be given to the player upon completing their scav case build
     * @param body client request
     * @returns Product array
     */
    static generate(body)
    {
        // Get scavcase details from hideout/scavcase.json
        const scavCaseDetails =
            DatabaseServer.getTables().hideout.scavcase.find(
                r => r._id === body.recipeId
            );
        const rewardItemCounts =
            ScavCaseRewardGenerator.getScavCaseRewardCountsAndPrices(
                scavCaseDetails
            );

        const dbItems = ScavCaseRewardGenerator.getDbItems();

        // Get items that fit the price criteria as set by the scavCase config
        const commonPricedItems =
            ScavCaseRewardGenerator.getFilteredItemsByPrice(
                dbItems,
                rewardItemCounts.common
            );
        const rarePricedItems = ScavCaseRewardGenerator.getFilteredItemsByPrice(
            dbItems,
            rewardItemCounts.rare
        );
        const superRarePricedItems =
            ScavCaseRewardGenerator.getFilteredItemsByPrice(
                dbItems,
                rewardItemCounts.superrare
            );

        // Get randomly picked items from each item collction, the count range of which is defined in hideout/scavcase.json
        const randomlyPickedCommonRewards =
            ScavCaseRewardGenerator.pickRandomRewards(
                commonPricedItems,
                rewardItemCounts.common,
                "common"
            );
        const randomlyPickedRareRewards =
            ScavCaseRewardGenerator.pickRandomRewards(
                rarePricedItems,
                rewardItemCounts.rare,
                "rare"
            );
        const randomlyPickedSuperRareRewards =
            ScavCaseRewardGenerator.pickRandomRewards(
                superRarePricedItems,
                rewardItemCounts.superrare,
                "superrare"
            );

        // Add randomised stack sizes to ammo and money rewards
        const commonRewards =
            ScavCaseRewardGenerator.randomiseContainerItemRewards(
                randomlyPickedCommonRewards,
                "common"
            );
        const rareRewards =
            ScavCaseRewardGenerator.randomiseContainerItemRewards(
                randomlyPickedRareRewards,
                "rare"
            );
        const superRareRewards =
            ScavCaseRewardGenerator.randomiseContainerItemRewards(
                randomlyPickedSuperRareRewards,
                "superrare"
            );

        return [...commonRewards, ...rareRewards, ...superRareRewards];
    }

    /**
     * Get all db items that are not blacklisted in scavcase config
     * @returns filtered array of db items
     */
    static getDbItems()
    {
        return Object.entries(DatabaseServer.getTables().templates.items)
            .filter(item =>
            {
                if (
                    item[1]._type !== "Item" ||
                    ScavCaseConfig.rewardItemBlacklist.includes(item[1]._id)
                )
                {
                    return false;
                }

                if (
                    ScavCaseRewardGenerator.itemHasBlacklistedParent(
                        item[1]._id
                    )
                )
                {
                    return false;
                }

                return true;
            })
            .map(x => x[1]);
    }

    /**
     * Check if a template id has a blacklisted parent id
     * @param tplid template id to check
     * @returns true if item is blacklisted
     */
    static itemHasBlacklistedParent(tplid)
    {
        for (const blacklistedParent of ScavCaseConfig.rewardItemParentBlacklist)
        {
            if (ItemHelper.isOfBaseclass(tplid, blacklistedParent))
            {
                return false;
            }
        }
    }

    /**
     * Pick a number of items to be rewards, the count is defined by the values in
     * @param items item pool to pick rewards from
     * @param itemFilters how the rewards should be filtered down (by item count)
     * @returns
     */
    static pickRandomRewards(items, itemFilters, rarity)
    {
        const result = [];

        const randomCount = RandomUtil.getInt(
            itemFilters.minCount,
            itemFilters.maxCount
        );
        for (let i = 0; i < randomCount; i++)
        {
            if (ScavCaseRewardGenerator.rewardShouldBeMoney())
            {
                result.push(ScavCaseRewardGenerator.getRandomMoney());
            }
            else if (ScavCaseRewardGenerator.rewardShouldBeAmmo())
            {
                result.push(ScavCaseRewardGenerator.getRandomAmmo(rarity));
            }
            else
            {
                result.push(RandomUtil.getArrayValue(items));
            }
        }

        return result;
    }

    /**
     * Choose if money should be a reward based on the moneyRewardChancePercent config chance in scavCaseConfig
     * @returns true if reward should be money
     */
    static rewardShouldBeMoney()
    {
        return (
            RandomUtil.getInt(0, 99) <
            ScavCaseConfig.moneyRewards.moneyRewardChancePercent
        );
    }

    /**
     * Choose if ammo should be a reward based on the ammoRewardChancePercent config chance in scavCaseConfig
     * @returns true if reward should be ammo
     */
    static rewardShouldBeAmmo()
    {
        return (
            RandomUtil.getInt(0, 99) <
            ScavCaseConfig.ammoRewards.ammoRewardChancePercent
        );
    }

    /**
     * Choose from rouble/dollar/euro at random
     */
    static getRandomMoney()
    {
        const money = [];
        money.push(
            DatabaseServer.getTables().templates.items[
                "5449016a4bdc2d6f028b456f"
            ]
        ); //rub
        money.push(
            DatabaseServer.getTables().templates.items[
                "569668774bdc2da2298b4568"
            ]
        ); //euro
        money.push(
            DatabaseServer.getTables().templates.items[
                "5696686a4bdc2da3298b456a"
            ]
        ); // dollar

        const result = RandomUtil.getArrayValue(money);

        return result;
    }

    /**
     * Get a random ammo from items.json that is not in the ammo blacklist AND inside the price rage defined in scavcase.json config
     * @param rarity The rarity this ammo reward is for
     * @returns random ammo item from items.json
     */
    static getRandomAmmo(rarity)
    {
        // Get ammo from items.json not in the blacklist
        const ammoItems = Object.entries(
            DatabaseServer.getTables().templates.items
        )
            .filter(item =>
            {
                // not ammo, skip
                if (item[1]._parent !== BaseClasses.AMMO)
                {
                    return false;
                }

                // fail if on blacklist
                if (
                    ScavCaseConfig.ammoRewards.ammoRewardBlacklist[
                        rarity
                    ].includes(item[1]._id)
                )
                {
                    return false;
                }

                const handbookPrice = RagfairPriceService.getStaticPriceForItem(
                    item[1]._id
                );
                if (
                    handbookPrice >=
                        ScavCaseConfig.ammoRewards.ammoRewardValueRangeRub[
                            rarity
                        ].min &&
                    handbookPrice <=
                        ScavCaseConfig.ammoRewards.ammoRewardValueRangeRub[
                            rarity
                        ].max
                )
                {
                    return true;
                }

                return false;
            })
            .map(x => x[1]);

        // Get a random ammo and return it
        return RandomUtil.getArrayValue(ammoItems);
    }

    /**
     * Take all the rewards picked create the Product object array ready to return to calling code
     * Also add a stack count to ammo and money
     * @param rewardItems items to convert
     * @returns Product array
     */
    static randomiseContainerItemRewards(rewardItems, rarity)
    {
        const result = [];
        for (const item of rewardItems)
        {
            const resultItem = {
                _id: HashUtil.generate(),
                _tpl: item._id,
                upd: undefined,
            };

            ScavCaseRewardGenerator.addStackCountToAmmoAndMoney(
                item,
                resultItem,
                rarity
            );

            // Clean up upd object if it wasn't used
            if (!resultItem.upd)
            {
                delete resultItem.upd;
            }

            result.push(resultItem);
        }

        return result;
    }

    /**
     * Add a randomised stack count to ammo or money items
     * @param item money or ammo item
     * @param resultItem money or ammo item with a randomise stack size
     */
    static addStackCountToAmmoAndMoney(item, resultItem, rarity)
    {
        if (
            item._parent === BaseClasses.AMMO ||
            item._parent === BaseClasses.MONEY
        )
        {
            resultItem.upd = {
                StackObjectsCount:
                    ScavCaseRewardGenerator.getRandomAmountRewardForScavCase(
                        item,
                        rarity
                    ),
            };
        }
    }

    /**
     *
     * @param dbItems all items from the items.json
     * @param itemFilters controls how the dbItems will be filtered and returned (handbook price)
     * @returns filtered dbItems array
     */
    static getFilteredItemsByPrice(dbItems, itemFilters)
    {
        return dbItems.filter(item =>
        {
            const handbookPrice = RagfairPriceService.getStaticPriceForItem(
                item._id
            );
            if (
                handbookPrice >= itemFilters.minPriceRub &&
                handbookPrice <= itemFilters.maxPriceRub
            )
            {
                return true;
            }
        });
    }

    /**
     * Gathers the reward options from config and scavcase.json into a single object
     * @param scavCaseDetails scavcase.json values
     * @returns ScavCaseRewardCountsAndPrices object
     */
    static getScavCaseRewardCountsAndPrices(scavCaseDetails)
    {
        return {
            common: {
                minCount: scavCaseDetails.EndProducts["Common"].min,
                maxCount: scavCaseDetails.EndProducts["Common"].max,
                minPriceRub:
                    ScavCaseConfig.rewardItemValueRangeRub["common"].min,
                maxPriceRub:
                    ScavCaseConfig.rewardItemValueRangeRub["common"].max,
            },
            rare: {
                minCount: scavCaseDetails.EndProducts["Rare"].min,
                maxCount: scavCaseDetails.EndProducts["Rare"].max,
                minPriceRub: ScavCaseConfig.rewardItemValueRangeRub["rare"].min,
                maxPriceRub: ScavCaseConfig.rewardItemValueRangeRub["rare"].max,
            },
            superrare: {
                minCount: scavCaseDetails.EndProducts["Superrare"].min,
                maxCount: scavCaseDetails.EndProducts["Superrare"].max,
                minPriceRub:
                    ScavCaseConfig.rewardItemValueRangeRub["superrare"].min,
                maxPriceRub:
                    ScavCaseConfig.rewardItemValueRangeRub["superrare"].max,
            },
        };
    }

    /**
     * Randomises the size of ammo and money stacks
     * @param itemToCalculate ammo or money item
     * @param rarity rarity (common/rare/superrare)
     * @returns value to set stack count to
     */
    static getRandomAmountRewardForScavCase(itemToCalculate, rarity)
    {
        let amountToGive = 1;
        if (itemToCalculate._parent === BaseClasses.AMMO)
        {
            amountToGive = RandomUtil.getInt(
                ScavCaseConfig.ammoRewards.minStackSize,
                itemToCalculate._props.StackMaxSize
            );
        }
        else if (itemToCalculate._parent === BaseClasses.MONEY)
        {
            switch (itemToCalculate._id)
            {
                case Money.ROUBLES:
                    amountToGive = RandomUtil.getInt(
                        ScavCaseConfig.moneyRewards.rubCount[rarity].min,
                        ScavCaseConfig.moneyRewards.rubCount[rarity].max
                    );
                    break;
                case Money.EUROS:
                    amountToGive = RandomUtil.getInt(
                        ScavCaseConfig.moneyRewards.eurCount[rarity].min,
                        ScavCaseConfig.moneyRewards.eurCount[rarity].max
                    );
                    break;
                case Money.DOLLARS:
                    amountToGive = RandomUtil.getInt(
                        ScavCaseConfig.moneyRewards.usdCount[rarity].min,
                        ScavCaseConfig.moneyRewards.usdCount[rarity].max
                    );
                    break;
            }
        }
        return amountToGive;
    }
}

module.exports = ScavCaseRewardGenerator;

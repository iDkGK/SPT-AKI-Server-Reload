"use strict";

require("../Lib.js");

class RagfairOfferGenerator
{
    static createOffer(
        userID,
        time,
        items,
        barterScheme,
        loyalLevel,
        price,
        sellInOnePiece = false
    )
    {
        const isTrader = RagfairServerHelper.isTrader(userID);
        const trader =
            DatabaseServer.getTables().traders[isTrader ? userID : "ragfair"]
                .base;

        const offerRequirements = [];
        for (const barter of barterScheme)
        {
            const requirement = {
                _tpl: barter._tpl,
                count: barter.count,
                onlyFunctional: barter.onlyFunctional ?? false,
            };

            offerRequirements.push(requirement);
        }

        const offer = {
            _id: isTrader ? items[0]._id : HashUtil.generate(),
            intId: 0,
            user: {
                id: RagfairOfferGenerator.getTraderId(userID),
                memberType:
                    userID !== "ragfair"
                        ? RagfairServerHelper.getMemberType(userID)
                        : MemberCategory.DEFAULT,
                nickname: RagfairServerHelper.getNickname(userID),
                rating: RagfairOfferGenerator.getRating(userID),
                isRatingGrowing: RagfairOfferGenerator.getRatingGrowing(userID),
                avatar: trader.avatar,
            },
            root: items[0]._id,
            items: JsonUtil.clone(items),
            requirements: offerRequirements,
            requirementsCost: price,
            itemsCost: price,
            summaryCost: price,
            startTime: time,
            endTime: RagfairOfferGenerator.getOfferEndTime(userID, time),
            loyaltyLevel: loyalLevel,
            sellInOnePiece: sellInOnePiece,
            priority: false,

            name: "",
            shortName: "",
            locked: false,
            unlimitedCount: false,
            notAvailable: false,
            CurrentItemCount: 0,
        };

        return offer;
    }

    static getTraderId(userID)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            return SaveServer.getProfile(userID).characters.pmc._id;
        }

        return userID;
    }

    static getRating(userID)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            // player offer
            return SaveServer.getProfile(userID).characters.pmc.RagfairInfo
                .rating;
        }

        if (RagfairServerHelper.isTrader(userID))
        {
            // trader offer
            return 1;
        }

        // generated offer
        return RandomUtil.getFloat(
            RagfairConfig.dynamic.rating.min,
            RagfairConfig.dynamic.rating.max
        );
    }

    /**
     * Is the offers user rating growing
     * @param userID user to check rating of
     * @returns true if its growing
     */
    static getRatingGrowing(userID)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            // player offer
            return SaveServer.getProfile(userID).characters.pmc.RagfairInfo
                .isRatingGrowing;
        }

        if (RagfairServerHelper.isTrader(userID))
        {
            // trader offer
            return true;
        }

        // generated offer
        // 50/50 growing/falling
        return RandomUtil.getBool();
    }

    /**
     * Get number of section until offer should expire
     * @param userID Id of the offer owner
     * @param time Time the offer is posted
     * @returns number of seconds until offer expires
     */
    static getOfferEndTime(userID, time)
    {
        if (RagfairServerHelper.isPlayer(userID))
        {
            // Player offer
            return (
                TimeUtil.getTimestamp() +
                Math.round(12 * TimeUtil.oneHourAsSeconds)
            );
        }

        if (RagfairServerHelper.isTrader(userID))
        {
            // Trader offer
            return DatabaseServer.getTables().traders[userID].base.nextResupply;
        }

        // Generated fake-player offer
        return Math.round(
            time +
                RandomUtil.getInt(
                    RagfairConfig.dynamic.endTimeSeconds.min,
                    RagfairConfig.dynamic.endTimeSeconds.max
                )
        );
    }

    /**
     * Create multiple offers for items by using a unique list of items we've generated previously
     * @param expiredOffers optional, expired offers to regenerate
     */
    static generateDynamicOffers(expiredOffers = undefined)
    {
        const config = RagfairConfig.dynamic;

        // get assort items from param if they exist, otherwise grab freshly generated assorts
        const assortItemsToProcess = expiredOffers
            ? expiredOffers
            : RagfairAssortGenerator.getAssortItems();

        for (const assortItemIndex in assortItemsToProcess)
        {
            const assortItem = assortItemsToProcess[assortItemIndex];
            const itemDetails = ItemHelper.getItem(assortItem._tpl);

            const isPreset = PresetHelper.isPreset(assortItem._id);

            // Only perform checks on newly generated items, skip expired items being refreshed
            if (
                !expiredOffers &&
                !RagfairServerHelper.isItemValidRagfairItem(itemDetails)
            )
            {
                continue;
            }

            // Get item + sub-items if preset, otherwise just get item
            let items = isPreset
                ? RagfairServerHelper.getPresetItems(assortItem)
                : [
                    ...[assortItem],
                    ...ItemHelper.findAndReturnChildrenByAssort(
                        assortItem._id,
                        RagfairAssortGenerator.getAssortItems()
                    ),
                ];

            // Get number of offers to create
            // Limit to 1 offer when processing expired
            const offerCount = expiredOffers
                ? 1
                : Math.round(
                    RandomUtil.getInt(
                        config.offerItemCount.min,
                        config.offerItemCount.max
                    )
                );

            for (let index = 0; index < offerCount; index++)
            {
                items[0].upd.StackObjectsCount =
                    RagfairServerHelper.calculateDynamicStackCount(
                        items[0]._tpl,
                        isPreset
                    );

                const userID = HashUtil.generate();

                // get properties
                items = RagfairOfferGenerator.getItemCondition(
                    userID,
                    items,
                    itemDetails[1]
                );
                const barterScheme =
                    RagfairOfferGenerator.getOfferRequirements(items);
                const price = RagfairPriceService.getBarterPrice(barterScheme);

                const offer = RagfairOfferGenerator.createFleaOffer(
                    userID, // userID
                    TimeUtil.getTimestamp(), // time
                    items, // items
                    barterScheme, // barter scheme
                    1, // loyal level
                    price, // price
                    isPreset
                ); // sellAsOnePiece

                RagfairCategoriesService.incrementCategory(offer);
            }
        }
    }

    /**
     * Generate trader offers on flea using the traders assort data
     * @param traderID Trader to generate offers for
     */
    static generateFleaOffersForTrader(traderID)
    {
        // ensure old offers don't exist
        RagfairOfferService.removeAllOffersByTrader(traderID);

        // add trader offers
        const time = TimeUtil.getTimestamp();
        const trader = DatabaseServer.getTables().traders[traderID];
        const assorts = trader.assort;

        if (assorts.items.length === 0)
        {
            Logger.warning(
                `unable to generate flea offers for trader ${trader.base.nickname}, no assorts found`
            );
            return;
        }

        for (const item of assorts.items)
        {
            if (item.slotId !== "hideout")
            {
                // skip mod items
                continue;
            }

            // run blacklist check on trader offers
            if (RagfairConfig.dynamic.blacklist.traderItems)
            {
                const itemDetails = ItemHelper.getItem(item._tpl);
                if (!itemDetails[0])
                {
                    Logger.warning(
                        `generateTraderOffers() tpl: ${item._tpl} not an item, skipping`
                    );
                    continue;
                }

                // Don't include items that BSG has blacklisted from flea
                if (
                    RagfairConfig.dynamic.blacklist.enableBsgList &&
                    !itemDetails[1]._props.CanSellOnRagfair
                )
                {
                    continue;
                }
            }

            const isPreset = PresetHelper.isPreset(item._id);
            const items = isPreset
                ? RagfairServerHelper.getPresetItems(item)
                : [
                    ...[item],
                    ...ItemHelper.findAndReturnChildrenByAssort(
                        item._id,
                        assorts.items
                    ),
                ];

            const barterScheme = assorts.barter_scheme[item._id];
            if (!barterScheme)
            {
                Logger.warning(
                    `generateFleaOffersForTrader() failed to find barterScheme for item id: ${item._id} tpl: ${item._tpl} on ${trader.base.nickname}`
                );
                continue;
            }

            const barterSchemeItems = assorts.barter_scheme[item._id][0];
            const loyalLevel = assorts.loyal_level_items[item._id];
            const price = RagfairPriceService.getBarterPrice(barterSchemeItems);

            const offer = RagfairOfferGenerator.createFleaOffer(
                traderID,
                time,
                items,
                barterSchemeItems,
                loyalLevel,
                price
            );

            RagfairCategoriesService.incrementCategory(offer);

            // Refresh complete, reset flag to false
            trader.base.refreshTraderRagfairOffers = false;
        }
    }

    static getItemCondition(userID, items, itemDetails)
    {
        const item = RagfairOfferGenerator.addMissingCondition(items[0]);

        if (
            !RagfairServerHelper.isPlayer(userID) &&
            !RagfairServerHelper.isTrader(userID)
        )
        {
            if (itemDetails._parent === BaseClasses.KNIFE)
            {
                // Melee weapons cant have < 100% dura, skip
                return items;
            }

            if (
                RandomUtil.getInt(0, 99) <
                RagfairConfig.dynamic.condition.conditionChance * 100
            )
            {
                const multiplier = RandomUtil.getFloat(
                    RagfairConfig.dynamic.condition.min,
                    RagfairConfig.dynamic.condition.max
                );

                if ("Repairable" in item.upd)
                {
                    // randomise non-0 class armor
                    if (
                        itemDetails._props.armorClass &&
                        itemDetails._props.armorClass !== 0
                    )
                    {
                        // randomize durability
                        item.upd.Repairable.Durability =
                            Math.round(
                                item.upd.Repairable.Durability * multiplier
                            ) || 1;
                    }

                    if (!itemDetails._props.armorClass)
                    {
                        // randomize durability
                        item.upd.Repairable.Durability =
                            Math.round(
                                item.upd.Repairable.Durability * multiplier
                            ) || 1;
                    }
                }

                if ("MedKit" in item.upd)
                {
                    // randomize health
                    item.upd.MedKit.HpResource =
                        Math.round(item.upd.MedKit.HpResource * multiplier) ||
                        1;
                }
            }
        }

        items[0] = item;
        return items;
    }

    /**
     * Add missing conditions to an item if needed
     * Durabiltiy for repairable items
     * HpResource for medical items
     * @param item item to add conditions to
     * @returns Item with conditions added
     */
    static addMissingCondition(item)
    {
        const props = ItemHelper.getItem(item._tpl)[1]._props;
        const isRepairable = "Durability" in props;
        const isMedkit = "MaxHpResource" in props;

        if (isRepairable && props.Durability > 0)
        {
            item.upd.Repairable = {
                Durability: props.Durability,
                MaxDurability: props.Durability,
            };
        }

        if (isMedkit && props.MaxHpResource > 0)
        {
            item.upd.MedKit = {
                HpResource: props.MaxHpResource,
            };
        }

        return item;
    }

    // TODO: Change return type to actual type
    static getOfferRequirements(items)
    {
        const currency = RagfairServerHelper.getDynamicOfferCurrency();
        const price = RagfairPriceService.getDynamicOfferPrice(items, currency);

        return [
            {
                count: price,
                _tpl: currency,
            },
        ];
    }

    /**
     * Create a flea offer and store it in the Ragfair server offers array
     * @param userID owner of the offer
     * @param time time offer is put up
     * @param items items in the offer
     * @param barterScheme
     * @param loyalLevel
     * @param price price of offer
     * @param sellInOnePiece
     * @returns
     */
    static createFleaOffer(
        userID,
        time,
        items,
        barterScheme,
        loyalLevel,
        price,
        sellInOnePiece = false
    )
    {
        const offer = RagfairOfferGenerator.createOffer(
            userID,
            time,
            items,
            barterScheme,
            loyalLevel,
            price,
            sellInOnePiece
        );
        RagfairOfferService.addOffer(offer);

        return offer;
    }
}

module.exports = RagfairOfferGenerator;

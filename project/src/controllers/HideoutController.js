"use strict";

require("../Lib.js");

const areaTypes = {
    VENTS: 0,
    SECURITY: 1,
    LAVATORY: 2,
    STASH: 3,
    GENERATOR: 4,
    HEATING: 5,
    WATER_COLLECTOR: 6,
    MEDSTATION: 7,
    NUTRITION_UNIT: 8,
    REST_SPACE: 9,
    WORKBENCH: 10,
    INTEL_CENTER: 11,
    SHOOTING_RANGE: 12,
    LIBRARY: 13,
    SCAV_CASE: 14,
    ILLUMINATION: 15,
    PLACE_OF_FAME: 16,
    AIR_FILTERING: 17,
    SOLAR_POWER: 18,
    BOOZE_GENERATOR: 19,
    BITCOIN_FARM: 20,
    CHRISTMAS_TREE: 21,
};

class HideoutController
{
    static BITCOIN_FARM = "5d5c205bd582a50d042a3c0e";
    static WATER_COLLECTOR = "5d5589c1f934db045e6c5492";
    static BITCOIN = "59faff1d86f7746c51718c9c";
    static EXPEDITIONARY_FUEL_TANK = "5d1b371186f774253763a656";
    static NAME_BACKENDCOUNTERS_CRAFTING = "CounterHoursCrafting";
    static SKILL_NAME_HIDEOUT = "HideoutManagement";
    static HOUR_FOR_SKILL_CRAFTING = 28800;
    static SKILL_NAME_CRAFITING = "Crafting";

    static upgrade(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        const items = body.items.map(reqItem =>
        {
            const item = pmcData.Inventory.items.find(
                invItem => invItem._id === reqItem.id
            );
            return {
                inventoryItem: item,
                requestedItem: reqItem,
            };
        });

        // If it's not money, its construction / barter items
        for (const item of items)
        {
            if (!item.inventoryItem)
            {
                Logger.error(
                    `Failed to find item in inventory with id ${item.requestedItem.id}`
                );
                return HttpResponse.appendErrorToOutput(output);
            }

            if (
                PaymentHelper.isMoneyTpl(item.inventoryItem._tpl) &&
                item.inventoryItem.upd &&
                item.inventoryItem.upd.StackObjectsCount &&
                item.inventoryItem.upd.StackObjectsCount >
                    item.requestedItem.count
            )
            {
                item.inventoryItem.upd.StackObjectsCount -=
                    item.requestedItem.count;
            }
            else
            {
                InventoryHelper.removeItem(
                    pmcData,
                    item.inventoryItem._id,
                    sessionID,
                    output
                );
            }
        }

        // Construction time management
        const hideoutArea = pmcData.Hideout.Areas.find(
            area => area.type === body.areaType
        );
        if (!hideoutArea)
        {
            Logger.error(`Could not find area of type ${body.areaType}`);
            return HttpResponse.appendErrorToOutput(output);
        }

        const hideoutData = DatabaseServer.tables.hideout.areas.find(
            area => area.type === body.areaType
        );

        if (!hideoutData)
        {
            Logger.error(
                `Could not find area in database of type ${body.areaType}`
            );
            return HttpResponse.appendErrorToOutput(output);
        }

        const ctime =
            hideoutData.stages[hideoutArea.level + 1].constructionTime;

        if (ctime > 0)
        {
            const timestamp = TimeUtil.getTimestamp();

            hideoutArea.completeTime = timestamp + ctime;
            hideoutArea.constructing = true;
        }

        return output;
    }

    static upgradeComplete(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        const hideoutArea = pmcData.Hideout.Areas.find(
            area => area.type === body.areaType
        );

        if (!hideoutArea)
        {
            Logger.error(`Could not find area of type ${body.areaType}`);
            return HttpResponse.appendErrorToOutput(output);
        }

        // Upgrade area
        hideoutArea.level++;
        hideoutArea.completeTime = 0;
        hideoutArea.constructing = false;

        const hideoutData = DatabaseServer.tables.hideout.areas.find(
            area => area.type === hideoutArea.type
        );

        if (!hideoutData)
        {
            Logger.error(
                `Could not find area in database of type ${body.areaType}`
            );
            return HttpResponse.appendErrorToOutput(output);
        }

        // Apply bonuses
        const bonuses = hideoutData.stages[hideoutArea.level].bonuses;

        if (bonuses.length > 0)
        {
            for (const bonus of bonuses)
            {
                HideoutController.applyPlayerUpgradesBonuses(pmcData, bonus);
            }
        }

        // Add Skill Points Per Area Upgrade
        //TODO using a variable for value of increment
        PlayerService.incrementSkillLevel(
            pmcData,
            output.profileChanges[sessionID],
            HideoutController.SKILL_NAME_HIDEOUT,
            80
        );

        return output;
    }

    // Move items from hideout
    static putItemsInAreaSlots(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);

        const items = Object.entries(body.items).map(kvp =>
        {
            const item = pmcData.Inventory.items.find(
                invItem => invItem._id === kvp[1]["id"]
            );
            return {
                inventoryItem: item,
                requestedItem: kvp[1],
                slot: kvp[0],
            };
        });

        const hideoutArea = pmcData.Hideout.Areas.find(
            area => area.type === body.areaType
        );
        if (!hideoutArea)
        {
            Logger.error(`Could not find area of type ${body.areaType}`);
            return HttpResponse.appendErrorToOutput(output);
        }

        for (const item of items)
        {
            if (!item.inventoryItem)
            {
                Logger.error(
                    `Failed to find item in inventory with id ${item.requestedItem["id"]}`
                );
                return HttpResponse.appendErrorToOutput(output);
            }

            const slotPosition = item.slot;
            const slotToAdd = {
                item: [
                    {
                        _id: item.inventoryItem._id,
                        _tpl: item.inventoryItem._tpl,
                        upd: item.inventoryItem.upd,
                    },
                ],
            };

            if (!(slotPosition in hideoutArea.slots))
            {
                hideoutArea.slots.push(slotToAdd);
            }
            else
            {
                hideoutArea.slots.splice(Number(slotPosition), 1, slotToAdd);
            }

            output = InventoryHelper.removeItem(
                pmcData,
                item.inventoryItem._id,
                sessionID,
                output
            );
        }

        return output;
    }

    static takeItemsFromAreaSlots(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);

        const hideoutArea = pmcData.Hideout.Areas.find(
            area => area.type === body.areaType
        );
        if (!hideoutArea)
        {
            Logger.error(`Could not find area of type ${body.areaType}`);
            return HttpResponse.appendErrorToOutput(output);
        }

        if (hideoutArea.type === areaTypes.GENERATOR)
        {
            const itemToMove = hideoutArea.slots[body.slots[0]].item[0];
            const newReq = {
                items: [
                    {
                        item_id: itemToMove._tpl,
                        count: 1,
                    },
                ],
                tid: "ragfair",
            };

            output = InventoryHelper.addItem(
                pmcData,
                newReq,
                output,
                sessionID,
                null
            );

            // If addItem returned with errors, don't continue any further
            if (output.warnings && output.warnings.length > 0)
            {
                return output;
            }

            pmcData = ProfileHelper.getPmcProfile(sessionID);
            output.profileChanges[sessionID].items.new[0].upd = itemToMove.upd;

            const item = pmcData.Inventory.items.find(
                i => i._id === output.profileChanges[sessionID].items.new[0]._id
            );
            if (item)
            {
                item.upd = itemToMove.upd;
            }
            else
            {
                Logger.error(
                    `Could not find item in inventory with id ${output.profileChanges[sessionID].items.new[0]._id}`
                );
            }

            hideoutArea.slots[body.slots[0]] = {
                item: null,
            };
        }
        else
        {
            if (
                !hideoutArea.slots[0] ||
                !hideoutArea.slots[0].item[0] ||
                !hideoutArea.slots[0].item[0]._tpl
            )
            {
                Logger.error(
                    `Could not find item to take out of slot 0 for areaType ${hideoutArea.type}`
                );
                return HttpResponse.appendErrorToOutput(output);
            }

            const newReq = {
                items: [
                    {
                        item_id: hideoutArea.slots[0].item[0]._tpl,
                        count: 1,
                    },
                ],
                tid: "ragfair",
            };

            output = InventoryHelper.addItem(
                pmcData,
                newReq,
                output,
                sessionID,
                null
            );

            // If addItem returned with errors, don't continue any further
            if (output.warnings && output.warnings.length > 0)
            {
                return output;
            }

            hideoutArea.slots.splice(0, 1);
        }

        return output;
    }

    static toggleArea(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        const hideoutArea = pmcData.Hideout.Areas.find(
            area => area.type === body.areaType
        );

        if (!hideoutArea)
        {
            Logger.error(`Could not find area of type ${body.areaType}`);
            return HttpResponse.appendErrorToOutput(output);
        }

        hideoutArea.active = body.enabled;

        return output;
    }

    static singleProductionStart(pmcData, body, sessionID)
    {
        HideoutController.registerProduction(pmcData, body, sessionID);

        let output = ItemEventRouter.getOutput(sessionID);

        for (const itemToDelete of body.items)
        {
            output = InventoryHelper.removeItem(
                pmcData,
                itemToDelete.id,
                sessionID,
                output
            );
        }

        return output;
    }

    /**
     * This convinience function intialies new Production Object
     * with all the constants.
     * @param {*} recipeId
     * @param {*} productionTime
     * @returns object
     */
    static initProduction(recipeId, productionTime)
    {
        return {
            Progress: 0,
            inProgress: true,
            RecipeId: recipeId,
            Products: [],
            SkipTime: 0,
            ProductionTime: productionTime,
            StartTimestamp: TimeUtil.getTimestamp(),
        };
    }

    static scavCaseProductionStart(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);

        for (const requestedItem of body.items)
        {
            const inventoryItem = pmcData.Inventory.items.find(
                item => item._id === requestedItem.id
            );
            if (!inventoryItem)
            {
                Logger.error(
                    `Could not find item requested by ScavCase with id ${requestedItem.id}`
                );
                return HttpResponse.appendErrorToOutput(output);
            }

            if (
                inventoryItem.upd &&
                inventoryItem.upd.StackObjectsCount &&
                inventoryItem.upd.StackObjectsCount > requestedItem.count
            )
            {
                inventoryItem.upd.StackObjectsCount -= requestedItem.count;
            }
            else
            {
                output = InventoryHelper.removeItem(
                    pmcData,
                    requestedItem.id,
                    sessionID,
                    output
                );
            }
        }

        const recipe = DatabaseServer.tables.hideout.scavcase.find(
            r => r._id === body.recipeId
        );
        if (!recipe)
        {
            Logger.error(
                `Failed to find Scav Case recipe with id ${body.recipeId}`
            );
            return HttpResponse.appendErrorToOutput(output);
        }

        const rarityItemCounter = {};
        const products = [];

        for (const rarity in recipe.EndProducts)
        {
            if (recipe.EndProducts[rarity].max > 0)
            {
                rarityItemCounter[rarity] = RandomUtil.getInt(
                    recipe.EndProducts[rarity].min,
                    recipe.EndProducts[rarity].max
                );
            }
        }

        for (const rarityType in rarityItemCounter)
        {
            // Logger.log("Looking for "+rarityItemCounter[rarityType]+" items of rarity " + rarityType);
            const randomIdx = [];
            for (
                let idx = 0;
                idx <
                Object.keys(DatabaseServer.tables.templates.clientItems.data)
                    .length;
                idx++
            )
            {
                randomIdx.push(
                    Object.keys(
                        DatabaseServer.tables.templates.clientItems.data
                    )[idx]
                );
            }

            // Fisher-Yates shuffle the indices
            for (let i = randomIdx.length - 1; i > 0; i--)
            {
                const j = Math.floor(Math.random() * i);
                const k = randomIdx[i];
                randomIdx[i] = randomIdx[j];
                randomIdx[j] = k;
            }

            for (
                let random = 0;
                random < randomIdx.length && rarityItemCounter[rarityType] > 0;
                random++
            )
            {
                const tempItem =
                    DatabaseServer.tables.templates.clientItems.data[
                        randomIdx[random]
                    ];
                if (tempItem === null) continue;
                const isItemInBlacklist =
                    HideoutConfig.scavCase.rewardItemBlacklist.includes(
                        tempItem._id
                    ) ||
                    HideoutConfig.scavCase.rewardParentBlacklist.includes(
                        tempItem._parent
                    );

                if (
                    tempItem._props &&
                    tempItem._props.Rarity === rarityType &&
                    !isItemInBlacklist
                )
                {
                    // ppcinj: This temporary item is transformed before it is passed as result in the takeProduction method.
                    // Changes here won't apply to the final object the user receives.
                    const newItem = {
                        _id: HashUtil.generate(),
                        _tpl: tempItem._id,
                    };
                    if (
                        tempItem._parent === ItemHelper.BASECLASS.Ammo ||
                        tempItem._parent === ItemHelper.BASECLASS.Money
                    )
                    {
                        const amount =
                            HideoutController.getRandomAmountRewardForScavCase(
                                tempItem
                            );
                        newItem.upd = {
                            StackObjectsCount: amount,
                        };
                    }
                    products.push(newItem);

                    rarityItemCounter[rarityType] -= 1;
                }
            }
        }

        pmcData.Hideout.Production["ScavCase"] = {
            Products: products,
        };

        // @Important: Here we need to be very exact:
        // - normal recipe: Production time value is stored in attribute "productionType" with small "p"
        // - scav case recipe: Production time value is stored in attribute "ProductionType" with capital "P"
        pmcData.Hideout.Production[body.recipeId] =
            HideoutController.initProduction(
                body.recipeId,
                recipe.ProductionTime
            );

        return output;
    }

    static getRandomAmountRewardForScavCase(itemToCalculate)
    {
        let amountToGive = 1;
        if (itemToCalculate._parent === ItemHelper.BASECLASS.Ammo)
        {
            if (HideoutConfig.scavCase.ammoRewards.giveMultipleOfTen)
            {
                const maxMultiplier = Math.floor(
                    itemToCalculate._props.StackMaxSize / 10
                );
                let minMultiplier = Math.floor(
                    HideoutConfig.scavCase.ammoRewards.minAmount / 10
                );
                if (minMultiplier > maxMultiplier)
                {
                    minMultiplier = maxMultiplier;
                }
                amountToGive =
                    RandomUtil.getInt(minMultiplier, maxMultiplier) * 10;
            }
            else
            {
                let minAmount = HideoutConfig.scavCase.ammoRewards.minAmount;
                if (minAmount > itemToCalculate._props.StackMaxSize)
                {
                    minAmount = itemToCalculate._props.StackMaxSize;
                }
                amountToGive = RandomUtil.getInt(
                    HideoutConfig.scavCase.ammoRewards.minAmount,
                    itemToCalculate._props.StackMaxSize
                );
            }
        }
        else if (itemToCalculate._parent === ItemHelper.BASECLASS.Money)
        {
            switch (itemToCalculate._id)
            {
                case ItemHelper.MONEY.Roubles:
                    amountToGive = RandomUtil.getInt(
                        HideoutConfig.scavCase.moneyRewards.rub.min,
                        HideoutConfig.scavCase.moneyRewards.rub.max
                    );
                    break;
                case ItemHelper.MONEY.Euros:
                    amountToGive = RandomUtil.getInt(
                        HideoutConfig.scavCase.moneyRewards.eur.min,
                        HideoutConfig.scavCase.moneyRewards.eur.max
                    );
                    break;
                case ItemHelper.MONEY.Dollars:
                    amountToGive = RandomUtil.getInt(
                        HideoutConfig.scavCase.moneyRewards.usd.min,
                        HideoutConfig.scavCase.moneyRewards.usd.max
                    );
                    break;
            }
        }
        return amountToGive;
    }

    static continuousProductionStart(pmcData, body, sessionID)
    {
        HideoutController.registerProduction(pmcData, body, sessionID);
        return ItemEventRouter.getOutput(sessionID);
    }

    static getBTC(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);

        const bitCoinCount =
            pmcData.Hideout.Production[HideoutController.BITCOIN_FARM].Products
                .length;
        if (!bitCoinCount)
        {
            Logger.error("No bitcoins are ready for pickup!");
            return HttpResponse.appendErrorToOutput(output);
        }

        const newBTC = {
            items: [
                {
                    item_id: HideoutController.BITCOIN,
                    count: pmcData.Hideout.Production[
                        HideoutController.BITCOIN_FARM
                    ].Products.length,
                },
            ],
            tid: "ragfair",
        };

        const callback = () =>
        {
            pmcData.Hideout.Production[
                HideoutController.BITCOIN_FARM
            ].Products = [];
        };

        return InventoryHelper.addItem(
            pmcData,
            newBTC,
            output,
            sessionID,
            callback,
            true
        );
    }

    static takeProduction(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);

        //variables for managemnet of skill
        let craftingExpAmount = 0;

        // ? move the logic of BackendCounters in new method?
        let counterHoursCrafting =
            pmcData.BackendCounters[
                HideoutController.NAME_BACKENDCOUNTERS_CRAFTING
            ];
        if (!counterHoursCrafting)
        {
            pmcData.BackendCounters[
                HideoutController.NAME_BACKENDCOUNTERS_CRAFTING
            ] = {
                id: HideoutController.NAME_BACKENDCOUNTERS_CRAFTING,
                value: 0,
            };
            counterHoursCrafting =
                pmcData.BackendCounters[
                    HideoutController.NAME_BACKENDCOUNTERS_CRAFTING
                ];
        }
        let hoursCrafting = counterHoursCrafting.value;

        if (body.recipeId === HideoutController.BITCOIN_FARM)
        {
            return HideoutController.getBTC(pmcData, body, sessionID);
        }

        const recipe = DatabaseServer.tables.hideout.production.find(
            r => r._id === body.recipeId
        );
        if (recipe)
        {
            // create item and throw it into profile
            let id = recipe.endProduct;

            // replace the base item with its main preset
            if (PresetHelper.hasPreset(id))
            {
                id = PresetHelper.getDefaultPreset(id)._id;
            }

            const newReq = {
                items: [
                    {
                        item_id: id,
                        count: recipe.count,
                    },
                ],
                tid: "ragfair",
            };

            const entries = Object.entries(pmcData.Hideout.Production);

            let prodId;
            for (const x of entries)
            {
                if (HideoutController.isProductionType(x[1]))
                {
                    // Production or ScavCase
                    if (x[1].RecipeId === body.recipeId)
                    {
                        prodId = x[0]; // set to objects key
                        break;
                    }
                }
            }

            if (prodId === undefined)
            {
                Logger.error(
                    `Could not find production in pmcData with RecipeId ${body.recipeId}`
                );
                return HttpResponse.appendErrorToOutput(output);
            }
            //const kvp = Object.entries(pmcData.Hideout.Production).find(kvp => kvp[1].RecipeId === body.recipeId);
            // if (!kvp || !kvp[0])
            // {
            //     Logger.error(`Could not find production in pmcData with RecipeId ${body.recipeId}`);
            //     return HttpResponse.appendErrorToOutput(output);
            // }

            // check if the recipe is the same as the last one
            const area = pmcData.Hideout.Areas[recipe.areaType];

            if (area && body.recipeId !== area.lastRecipe)
            {
                // 1 point per craft upon the end of production for alternating between 2 different crafting recipes in the same module
                craftingExpAmount += 10;
            }

            // 1 point per 8 hours of crafting
            hoursCrafting += recipe.productionTime;
            if (
                hoursCrafting / HideoutController.HOUR_FOR_SKILL_CRAFTING >=
                1
            )
            {
                const multiplierCrafting = Math.floor(
                    hoursCrafting / HideoutController.HOUR_FOR_SKILL_CRAFTING
                );
                craftingExpAmount += 1 * multiplierCrafting;
                hoursCrafting -=
                    HideoutController.HOUR_FOR_SKILL_CRAFTING *
                    multiplierCrafting;
            }

            // increment
            // if addItem passes validation:
            //  - increment skill point for crafting
            //  - delete the production in profile Hideout.Production
            const callback = () =>
            {
                // manager Hideout skill
                // ? use a configuration variable for the value?
                PlayerService.incrementSkillLevel(
                    pmcData,
                    output.profileChanges[sessionID],
                    HideoutController.SKILL_NAME_HIDEOUT,
                    4
                );
                //manager Crafting skill
                if (craftingExpAmount > 0)
                {
                    PlayerService.incrementSkillLevel(
                        pmcData,
                        output.profileChanges[sessionID],
                        HideoutController.SKILL_NAME_CRAFITING,
                        craftingExpAmount
                    );
                }
                area.lastRecipe = body.recipeId;
                counterHoursCrafting.value = hoursCrafting;

                //delete production
                delete pmcData.Hideout.Production[prodId];
            };

            return InventoryHelper.addItem(
                pmcData,
                newReq,
                output,
                sessionID,
                callback,
                true
            );
        }

        const scavCase = DatabaseServer.tables.hideout.scavcase.find(
            r => r._id === body.recipeId
        );
        if (scavCase)
        {
            const entries = Object.entries(pmcData.Hideout.Production);
            let prodId;
            for (const x of entries)
            {
                if (HideoutController.isProductionType(x[1]))
                {
                    // Production or ScavCase
                    if (x[1].RecipeId === body.recipeId)
                    {
                        prodId = x[0]; // set to objects key
                        break;
                    }
                }
            }

            if (prodId === undefined)
            {
                Logger.error(
                    `Could not find production in pmcData with RecipeId ${body.recipeId}`
                );
                return HttpResponse.appendErrorToOutput(output);
            }
            // const kvp = Object.entries(pmcData.Hideout.Production).find(kvp => kvp[1].RecipeId === body.recipeId);
            // if (!kvp || !kvp[0])
            // {
            //     Logger.error(`Could not find production in pmcData with RecipeId ${body.recipeId}`);
            //     return HttpResponse.appendErrorToOutput(output);
            // }

            pmcData.Hideout.Production[prodId].Products =
                pmcData.Hideout.Production["ScavCase"].Products;

            const itemsToAdd = pmcData.Hideout.Production[prod].Products.map(
                x =>
                {
                    let id = x._tpl;
                    if (PresetHelper.hasPreset(id))
                    {
                        id = PresetHelper.getDefaultPreset(id)._id;
                    }
                    const numOfItems =
                        !x.upd || !x.upd.StackObjectsCount
                            ? 1
                            : x.upd.StackObjectsCount;
                    return { item_id: id, count: numOfItems };
                }
            );

            const newReq = {
                items: itemsToAdd,
                tid: "ragfair",
            };

            const callback = () =>
            {
                delete pmcData.Hideout.Production[prodId];
                delete pmcData.Hideout.Production["ScavCase"];
            };

            return InventoryHelper.addItem(
                pmcData,
                newReq,
                output,
                sessionID,
                callback,
                true
            );
        }

        Logger.error(`Failed to locate any recipe with id ${body.recipeId}`);
        return HttpResponse.appendErrorToOutput(output);
    }

    static isProductionType(productive)
    {
        return (
            productive.Progress !== undefined ||
            productive.RecipeId !== undefined
        );
    }

    static isScavCaseType(productive)
    {
        return productive.Products !== undefined;
    }

    static registerProduction(pmcData, body, sessionID)
    {
        const recipe = DatabaseServer.tables.hideout.production.find(
            p => p._id === body.recipeId
        );
        if (!recipe)
        {
            Logger.error(`Failed to locate recipe with _id ${body.recipeId}`);
            return HttpResponse.appendErrorToOutput(
                ItemEventRouter.getOutput(sessionID)
            );
        }

        // @Important: Here we need to be very exact:
        // - normal recipe: Production time value is stored in attribute "productionType" with small "p"
        // - scav case recipe: Production time value is stored in attribute "ProductionType" with capital "P"
        pmcData.Hideout.Production[body.recipeId] =
            HideoutController.initProduction(
                body.recipeId,
                recipe.productionTime
            );
    }

    // BALIST0N, I got bad news for you
    // we do need to implement these after all
    // ...
    // with that I mean manual implementation
    // RIP, GL whoever is going to do this
    static applyPlayerUpgradesBonuses(pmcData, bonus)
    {
        switch (bonus.type)
        {
            case "StashSize":
                for (const item in pmcData.Inventory.items)
                {
                    if (
                        pmcData.Inventory.items[item]._id ===
                        pmcData.Inventory.stash
                    )
                    {
                        pmcData.Inventory.items[item]._tpl = bonus.templateId;
                    }
                }
                break;
            case "MaximumEnergyReserve":
                pmcData.Health.Energy.Maximum = 110;
                break;
            case "EnergyRegeneration":
            case "HydrationRegeneration":
            case "HealthRegeneration":
            case "DebuffEndDelay":
            case "QuestMoneyReward":
            case "ExperienceRate":
            case "SkillGroupLevelingBoost":
                HideoutController.applySkillXPBoost(pmcData, bonus);
                break;
            case "ScavCooldownTimer":
            case "InsuranceReturnTime":
            case "RagfairCommission":
            case "FuelConsumption":
                // These skill is being applied automatically on the RagfairController, InsuranceController, ProfileController, HideoutController
                // ScavCooldownTimer, InsuranceReturnTime, RagfairCommission, FuelConsumption
                break;
            case "AdditionalSlots":
                // Some of these are also implemented on the HideoutController
                break;
            case "UnlockWeaponModification":
            case "RepairArmorBonus":
            case "RepairWeaponBonus":
            case "UnlockArmorRepair":
            case "UnlockWeaponRepair":
            case "TextBonus":
                break;
        }

        pmcData.Bonuses.push(bonus);
    }

    // TODO:
    // After looking at the skills there doesnt seem to be a configuration per skill to boost
    // the XP gain PER skill. I THINK you should be able to put the variable "SkillProgress" (just like health has it)
    // and be able to tune the skill gain PER skill, but I havent tested it and Im not sure!
    static applySkillXPBoost(pmcData, bonus)
    {
        const skillGroupType = bonus.skillType;
        if (skillGroupType)
        {
            switch (skillGroupType)
            {
                case "Physical":
                case "Mental":
                case "Combat":
                case "Practical":
                case "Special":
                default:
                    break;
            }
        }
    }

    static update()
    {
        for (const sessionID in SaveServer.getProfiles())
        {
            if ("Hideout" in SaveServer.getProfile(sessionID).characters.pmc)
            {
                HideoutController.updatePlayerHideout(sessionID);
            }
        }
    }

    static updatePlayerHideout(sessionID)
    {
        const recipes = DatabaseServer.tables.hideout.production;
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        let btcFarmCGs = 0;
        let isGeneratorOn = false;
        let waterCollectorHasFilter = false;

        for (let area of pmcData.Hideout.Areas)
        {
            switch (area.type)
            {
                case areaTypes.GENERATOR:
                    isGeneratorOn = area.active;

                    if (isGeneratorOn)
                    {
                        area = HideoutController.updateFuel(area, pmcData);
                    }
                    break;

                case areaTypes.WATER_COLLECTOR:
                    if (area.level === 3)
                    {
                        const prod =
                            pmcData.Hideout.Production[
                                HideoutController.WATER_COLLECTOR
                            ];
                        if (prod && HideoutController.isProduction(prod))
                        {
                            area = HideoutController.updateWaterFilters(
                                area,
                                prod,
                                isGeneratorOn,
                                pmcData
                            );
                        }
                        else
                        {
                            // continuousProductionStart()
                            // seem to not trigger consistently
                            const recipe = {
                                recipeId: HideoutController.WATER_COLLECTOR,
                                Action: "HideoutSingleProductionStart",
                                items: [],
                                timestamp: TimeUtil.getTimestamp(),
                            };

                            HideoutController.registerProduction(
                                pmcData,
                                recipe,
                                sessionID
                            );
                        }

                        for (const slot of area.slots)
                        {
                            if (slot.item)
                            {
                                waterCollectorHasFilter = true;
                                break;
                            }
                        }
                    }
                    break;

                case areaTypes.AIR_FILTERING:
                    if (isGeneratorOn)
                    {
                        area = HideoutController.updateAirFilters(
                            area,
                            pmcData
                        );
                    }
                    break;

                case areaTypes.BITCOIN_FARM:
                    for (const slot of area.slots)
                    {
                        if (slot.item)
                        {
                            btcFarmCGs++;
                        }
                    }
                    break;
            }
        }

        // update production time
        for (const prod in pmcData.Hideout.Production)
        {
            const scavCaseRecipe = DatabaseServer.tables.hideout.scavcase.find(
                r => r._id === prod
            );
            if (!pmcData.Hideout.Production[prod].inProgress)
            {
                continue;
            }

            if (scavCaseRecipe)
            {
                const timeElapsed =
                    TimeUtil.getTimestamp() -
                    pmcData.Hideout.Production[prod].StartTimestamp -
                    pmcData.Hideout.Production[prod].Progress;
                pmcData.Hideout.Production[prod].Progress += timeElapsed;
                continue;
            }

            if (prod === HideoutController.WATER_COLLECTOR)
            {
                let timeElapsed =
                    TimeUtil.getTimestamp() -
                    pmcData.Hideout.Production[prod].StartTimestamp -
                    pmcData.Hideout.Production[prod].Progress;
                if (!isGeneratorOn)
                {
                    timeElapsed = Math.floor(timeElapsed * 0.2);
                }

                if (waterCollectorHasFilter)
                {
                    pmcData.Hideout.Production[prod].Progress += timeElapsed;
                }
                continue;
            }

            if (prod === HideoutController.BITCOIN_FARM)
            {
                pmcData.Hideout.Production[prod] =
                    HideoutController.updateBitcoinFarm(
                        pmcData,
                        btcFarmCGs,
                        isGeneratorOn
                    );
                continue;
            }

            //other recipes
            const recipe = recipes.find(r => r._id === prod);
            if (!recipe)
            {
                Logger.error(`Could not find recipe ${prod} for area type`);
                continue;
            }

            let timeElapsed =
                TimeUtil.getTimestamp() -
                pmcData.Hideout.Production[prod].StartTimestamp -
                pmcData.Hideout.Production[prod].Progress;
            if (recipe.continuous && !isGeneratorOn)
            {
                timeElapsed = Math.floor(timeElapsed * 0.2);
            }
            pmcData.Hideout.Production[prod].Progress += timeElapsed;
        }
    }

    static updateFuel(generatorArea, pmcData)
    {
        // 1 resource last 14 min 27 sec, 1/14.45/60 = 0.00115
        // 10-10-2021 From wiki, 1 resource last 12 minutes 38 seconds, 1/12.63333/60 = 0.00131
        let fuelDrainRate = 0.00131 * HideoutConfig.runIntervalSeconds;
        // implemented moddable bonus for fuel consumption bonus instead of using solar power variable as before
        const fuelBonus = pmcData.Bonuses.find(
            b => b.type === "FuelConsumption"
        );
        const fuelBonusPercent =
            1.0 - (fuelBonus ? Math.abs(fuelBonus.value) : 0) / 100;
        fuelDrainRate *= fuelBonusPercent;
        // Hideout management resource consumption bonus:
        const hideoutManagementConsumptionBonus =
            1.0 -
            HideoutController.getHideoutManagementConsumptionBonus(pmcData);
        fuelDrainRate *= hideoutManagementConsumptionBonus;
        let hasAnyFuelRemaining = false;
        let pointsConsumed = 0;

        for (let i = 0; i < generatorArea.slots.length; i++)
        {
            if (!generatorArea.slots[i].item)
            {
                continue;
            }
            else
            {
                let resourceValue =
                    generatorArea.slots[i].item[0].upd &&
                    generatorArea.slots[i].item[0].upd.Resource
                        ? generatorArea.slots[i].item[0].upd.Resource.Value
                        : null;
                if (resourceValue === 0)
                {
                    continue;
                }
                else if (!resourceValue)
                {
                    const fuelItem = HideoutController.EXPEDITIONARY_FUEL_TANK;
                    resourceValue =
                        generatorArea.slots[i].item[0]._tpl === fuelItem
                            ? (resourceValue = 60 - fuelDrainRate)
                            : (resourceValue = 100 - fuelDrainRate);
                    pointsConsumed = fuelDrainRate;
                }
                else
                {
                    pointsConsumed =
                        (generatorArea.slots[i].item[0].upd.Resource
                            .UnitsConsumed || 0) + fuelDrainRate;
                    resourceValue -= fuelDrainRate;
                }

                resourceValue = Math.round(resourceValue * 10000) / 10000;
                pointsConsumed = Math.round(pointsConsumed * 10000) / 10000;

                //check unit consumed for increment skill point
                if (pmcData && Math.floor(pointsConsumed / 10) >= 1)
                {
                    PlayerService.incrementSkillLevel(
                        pmcData,
                        null,
                        HideoutController.SKILL_NAME_HIDEOUT,
                        1
                    );
                    pointsConsumed -= 10;
                }

                if (resourceValue > 0)
                {
                    generatorArea.slots[i].item[0].upd =
                        HideoutController.getAreaUpdObject(
                            1,
                            resourceValue,
                            pointsConsumed
                        );

                    console.log(
                        `Generator: ${resourceValue} fuel left on tank slot ${
                            i + 1
                        }`
                    );
                    hasAnyFuelRemaining = true;
                    break; // Break here to avoid updating all the fuel tanks
                }
                else
                {
                    generatorArea.slots[i].item[0].upd =
                        HideoutController.getAreaUpdObject(1, 0, 0);

                    // Update remaining resources to be subtracted
                    fuelDrainRate = Math.abs(resourceValue);
                }
            }
        }

        if (!hasAnyFuelRemaining)
        {
            generatorArea.active = false;
        }

        return generatorArea;
    }

    static updateWaterFilters(waterFilterArea, pwProd, isGeneratorOn, pmcData)
    {
        let timeElapsed =
            TimeUtil.getTimestamp() - pwProd.StartTimestamp - pwProd.Progress;
        // 100 resources last 8 hrs 20 min, 100/8.33/60/60 = 0.00333
        let filterDrainRate = 0.00333;
        // Hideout management resource consumption bonus:
        const hideoutManagementConsumptionBonus =
            1.0 -
            HideoutController.getHideoutManagementConsumptionBonus(pmcData);
        filterDrainRate *= hideoutManagementConsumptionBonus;
        let productionTime = 0;
        let pointsConsumed = 0;

        const recipe = DatabaseServer.tables.hideout.production.find(
            prod => prod._id === HideoutController.WATER_COLLECTOR
        );
        productionTime = recipe.productionTime || 0;

        if (!isGeneratorOn)
        {
            timeElapsed = Math.floor(timeElapsed * 0.2);
        }
        filterDrainRate =
            timeElapsed > productionTime
                ? (filterDrainRate *= productionTime - pwProd.Progress)
                : (filterDrainRate *= timeElapsed);

        if (pwProd.Progress < productionTime)
        {
            for (let i = 0; i < waterFilterArea.slots.length; i++)
            {
                if (!waterFilterArea.slots[i].item)
                {
                    continue;
                }
                else
                {
                    let resourceValue =
                        waterFilterArea.slots[i].item[0].upd &&
                        waterFilterArea.slots[i].item[0].upd.Resource
                            ? waterFilterArea.slots[i].item[0].upd.Resource
                                .Value
                            : null;
                    if (!resourceValue)
                    {
                        resourceValue = 100 - filterDrainRate;
                        pointsConsumed = filterDrainRate;
                    }
                    else
                    {
                        pointsConsumed =
                            (waterFilterArea.slots[i].item[0].upd.Resource
                                .UnitsConsumed || 0) + filterDrainRate;
                        resourceValue -= filterDrainRate;
                    }
                    resourceValue = Math.round(resourceValue * 10000) / 10000;
                    pointsConsumed = Math.round(pointsConsumed * 10000) / 10000;

                    //check unit consumed for increment skill point
                    if (pmcData && Math.floor(pointsConsumed / 10) >= 1)
                    {
                        PlayerService.incrementSkillLevel(
                            pmcData,
                            null,
                            HideoutController.SKILL_NAME_HIDEOUT,
                            1
                        );
                        pointsConsumed -= 10;
                    }

                    if (resourceValue > 0)
                    {
                        waterFilterArea.slots[i].item[0].upd = {
                            StackObjectsCount: 1,
                            Resource: {
                                Value: resourceValue,
                                UnitsConsumed: pointsConsumed,
                            },
                        };
                        console.log(
                            `Water filter: ${resourceValue} filter left on slot ${
                                i + 1
                            }`
                        );
                        break; // Break here to avoid updating all filters
                    }
                    else
                    {
                        waterFilterArea.slots[i].item = null;
                        // Update remaining resources to be subtracted
                        filterDrainRate = Math.abs(resourceValue);
                    }
                }
            }
        }

        return waterFilterArea;
    }

    static getAreaUpdObject(stackCount, resourceValue, resourceUnitsConsumed)
    {
        return {
            StackObjectsCount: stackCount,
            Resource: {
                Value: resourceValue,
                UnitsConsumed: resourceUnitsConsumed,
            },
        };
    }

    static updateAirFilters(airFilterArea, pmcData)
    {
        // 300 resources last 20 hrs, 300/20/60/60 = 0.00416
        /* 10-10-2021 from WIKI (https://escapefromtarkov.fandom.com/wiki/FP-100_filter_absorber)
            Lasts for 17 hours 38 minutes and 49 seconds (23 hours 31 minutes and 45 seconds with elite hideout management skill),
            300/17.64694/60/60 = 0.004722
        */
        let filterDrainRate = 0.004722 * HideoutConfig.runIntervalSeconds;
        // Hideout management resource consumption bonus:
        const hideoutManagementConsumptionBonus =
            1.0 -
            HideoutController.getHideoutManagementConsumptionBonus(pmcData);
        filterDrainRate *= hideoutManagementConsumptionBonus;
        let pointsConsumed = 0;

        for (let i = 0; i < airFilterArea.slots.length; i++)
        {
            if (!airFilterArea.slots[i].item)
            {
                continue;
            }
            else
            {
                let resourceValue =
                    airFilterArea.slots[i].item[0].upd &&
                    airFilterArea.slots[i].item[0].upd.Resource
                        ? airFilterArea.slots[i].item[0].upd.Resource.Value
                        : null;
                if (!resourceValue)
                {
                    resourceValue = 300 - filterDrainRate;
                    pointsConsumed = filterDrainRate;
                }
                else
                {
                    pointsConsumed =
                        (airFilterArea.slots[i].item[0].upd.Resource
                            .UnitsConsumed || 0) + filterDrainRate;
                    resourceValue -= filterDrainRate;
                }
                resourceValue = Math.round(resourceValue * 10000) / 10000;
                pointsConsumed = Math.round(pointsConsumed * 10000) / 10000;

                //check unit consumed for increment skill point
                if (pmcData && Math.floor(pointsConsumed / 10) >= 1)
                {
                    PlayerService.incrementSkillLevel(
                        pmcData,
                        null,
                        HideoutController.SKILL_NAME_HIDEOUT,
                        1
                    );
                    pointsConsumed -= 10;
                }

                if (resourceValue > 0)
                {
                    airFilterArea.slots[i].item[0].upd = {
                        StackObjectsCount: 1,
                        Resource: {
                            Value: resourceValue,
                            UnitsConsumed: pointsConsumed,
                        },
                    };
                    console.log(
                        `Air filter: ${resourceValue} filter left on slot ${
                            i + 1
                        }`
                    );
                    break; // Break here to avoid updating all filters
                }
                else
                {
                    airFilterArea.slots[i].item = null;
                    // Update remaining resources to be subtracted
                    filterDrainRate = Math.abs(resourceValue);
                }
            }
        }

        return airFilterArea;
    }

    static updateBitcoinFarm(pmcData, btcFarmCGs, isGeneratorOn)
    {
        const btcProd =
            pmcData.Hideout.Production[HideoutController.BITCOIN_FARM];
        // this should never happen
        if (HideoutController.isProduction(btcProd))
        {
            const time_elapsed =
                4 * (TimeUtil.getTimestamp() - btcProd.StartTimestamp);

            if (isGeneratorOn)
            {
                btcProd.Progress += time_elapsed;
            }
            const finalProductionTime =
                145000 / (1 + (btcFarmCGs - 1) * 0.041225);
            const hideoutSlots = HideoutController.getBTCSlots(pmcData) || 3;
            while (btcProd.Progress > finalProductionTime)
            {
                if (btcProd.Products.length < hideoutSlots)
                {
                    btcProd.Products.push({
                        _id: HashUtil.generate(),
                        _tpl: "59faff1d86f7746c51718c9c",
                        upd: {
                            StackObjectsCount: 1,
                        },
                    });
                    btcProd.Progress -= finalProductionTime;
                }
                else
                {
                    btcProd.Progress = 0;
                }
            }
            btcProd.StartTimestamp = TimeUtil.getTimestamp();
            return btcProd;
        }
        else
        {
            return null;
        }
    }

    static getBTCSlots(pmcData)
    {
        const bitcoinProduction = DatabaseServer.tables.hideout.production.find(
            p => p._id === HideoutController.BITCOIN_FARM
        );
        const productionSlots = bitcoinProduction?.productionLimitCount || 3;
        const hasManagementSkillSlots =
            HideoutController.hasManagementSkillSlots(pmcData);
        const managementSlots =
            HideoutController.getManagementSkillsSlots() || 2;
        return (
            productionSlots + (hasManagementSkillSlots ? managementSlots : 0)
        );
    }

    static getManagementSkillsSlots()
    {
        return DatabaseServer.tables.globals.config.SkillsSettings
            .HideoutManagement.EliteSlots.BitcoinFarm.Container;
    }

    static hasManagementSkillSlots(pmcData)
    {
        return (
            HideoutController.getHideoutManagementSkill(pmcData)?.Progress >=
            5100
        );
    }

    static getHideoutManagementSkill(pmcData)
    {
        for (const skill of pmcData.Skills.Common)
        {
            if (skill.Id === "HideoutManagement")
            {
                return skill;
            }
        }
        return null;
    }

    static getHideoutManagementConsumptionBonus(pmcData)
    {
        const hideoutManagementSkill =
            HideoutController.getHideoutManagementSkill(pmcData);
        if (!hideoutManagementSkill)
        {
            return 0;
        }
        let roundedLevel = Math.floor(hideoutManagementSkill.Progress / 100);
        // If the level is 51 we need to round it at 50 so on elite you dont get 25.5%
        // at level 1 you already get 0.5%, so it goes up until level 50. For some reason the wiki
        // says that it caps at level 51 with 25% but as per dump data that is incorrect aparently
        roundedLevel = roundedLevel === 51 ? roundedLevel - 1 : roundedLevel;
        return (
            (roundedLevel *
                DatabaseServer.tables.globals.config.SkillsSettings
                    .HideoutManagement.ConsumptionReductionPerLevel) /
            100
        );
    }

    static isProduction(productive)
    {
        return (
            productive.Progress !== undefined ||
            productive.RecipeId !== undefined
        );
    }
}

module.exports = HideoutController;

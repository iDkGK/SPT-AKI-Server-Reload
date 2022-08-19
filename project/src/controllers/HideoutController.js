"use strict";

require("../Lib.js");

class HideoutController
{
    static get nameBackendCountersCrafting()
    {
        return "CounterHoursCrafting";
    }

    static update()
    {
        for (const sessionID in SaveServer.getProfiles())
        {
            if ("Hideout" in SaveServer.getProfile(sessionID).characters.pmc)
            {
                HideoutHelper.updatePlayerHideout(sessionID);
            }
        }
    }

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
                return HttpResponseUtil.appendErrorToOutput(output);
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
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        const hideoutData = DatabaseServer.getTables().hideout.areas.find(
            area => area.type === body.areaType
        );

        if (!hideoutData)
        {
            Logger.error(
                `Could not find area in database of type ${body.areaType}`
            );
            return HttpResponseUtil.appendErrorToOutput(output);
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
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        // Upgrade area
        hideoutArea.level++;
        hideoutArea.completeTime = 0;
        hideoutArea.constructing = false;

        const hideoutData = DatabaseServer.getTables().hideout.areas.find(
            area => area.type === hideoutArea.type
        );

        if (!hideoutData)
        {
            Logger.error(
                `Could not find area in database of type ${body.areaType}`
            );
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        // Apply bonuses
        const bonuses = hideoutData.stages[hideoutArea.level].bonuses;

        if (bonuses.length > 0)
        {
            for (const bonus of bonuses)
            {
                HideoutHelper.applyPlayerUpgradesBonuses(pmcData, bonus);
            }
        }

        // Add Skill Points Per Area Upgrade
        //TODO using a variable for value of increment
        PlayerService.incrementSkillLevel(
            pmcData,
            output.profileChanges[sessionID],
            SkillTypes.HIDEOUT_MANAGEMENT,
            80
        );

        return output;
    }

    /**
     * Create item in hideout slot item array, remove item from player inventory
     * @param pmcData Profile data
     * @param addItemToHideoutRequest reqeust from client to place item in area slot
     * @param sessionID Session id
     * @returns IItemEventRouterResponse object
     */
    static putItemsInAreaSlots(pmcData, addItemToHideoutRequest, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);

        const itemsToAdd = Object.entries(addItemToHideoutRequest.items).map(
            kvp =>
            {
                const item = pmcData.Inventory.items.find(
                    invItem => invItem._id === kvp[1]["id"]
                );
                return {
                    inventoryItem: item,
                    requestedItem: kvp[1],
                    slot: kvp[0],
                };
            }
        );

        const hideoutArea = pmcData.Hideout.Areas.find(
            area => area.type === addItemToHideoutRequest.areaType
        );
        if (!hideoutArea)
        {
            Logger.error(
                `Could not find area of type ${addItemToHideoutRequest.areaType}`
            );
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        for (const item of itemsToAdd)
        {
            if (!item.inventoryItem)
            {
                Logger.error(
                    `Failed to find item in inventory with id ${item.requestedItem["id"]}`
                );
                return HttpResponseUtil.appendErrorToOutput(output);
            }

            // Add item to area.slots
            const destinationLocationIndex = Number(item.slot);
            const hideoutSlotIndex = hideoutArea.slots.findIndex(
                x => x.locationIndex === destinationLocationIndex
            );
            hideoutArea.slots[hideoutSlotIndex].item = [
                {
                    _id: item.inventoryItem._id,
                    _tpl: item.inventoryItem._tpl,
                    upd: item.inventoryItem.upd,
                },
            ];

            output = InventoryHelper.removeItem(
                pmcData,
                item.inventoryItem._id,
                sessionID,
                output
            );
        }

        HideoutController.update();

        return output;
    }

    static takeItemsFromAreaSlots(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);

        const hideoutArea = pmcData.Hideout.Areas.find(
            area => area.type === body.areaType
        );
        if (!hideoutArea)
        {
            Logger.error(`Could not find area of type ${body.areaType}`);
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        if (!hideoutArea.slots || hideoutArea.slots.length === 0)
        {
            Logger.error(
                `Could not find any item to take out a slot for areaType ${hideoutArea.type}`
            );
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        // Handle areas that have resources that can be placed in/taken out of slots from the area
        if (
            [
                HideoutAreas.AIR_FILTERING,
                HideoutAreas.WATER_COLLECTOR,
                HideoutAreas.GENERATOR,
                HideoutAreas.BITCOIN_FARM,
            ].includes(hideoutArea.type)
        )
        {
            const response = HideoutController.removeResourceFromArea(
                sessionID,
                pmcData,
                body,
                output,
                hideoutArea
            );
            HideoutController.update();
            return response;
        }

        throw new Error(
            `Tried to remove item from unhandled hideout area ${hideoutArea.type}`
        );
    }

    /**
     * Find resource item in hideout area, add copy to player inventory, remove Item from hideout slot
     * @param sessionID Session id
     * @param pmcData Profile to update
     * @param removeResourceRequest client request
     * @param output response to send to client
     * @param hideoutArea Area fuel is being removed from
     * @returns IItemEventRouterResponse response
     */
    static removeResourceFromArea(
        sessionID,
        pmcData,
        removeResourceRequest,
        output,
        hideoutArea
    )
    {
        const slotIndexToRemove = removeResourceRequest.slots[0];

        const itemToReturn = hideoutArea.slots.find(
            x => x.locationIndex === slotIndexToRemove
        ).item[0];

        const newReq = {
            items: [
                {
                    item_id: itemToReturn._tpl,
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
            null,
            !!itemToReturn.upd.SpawnedInSession,
            itemToReturn.upd
        );

        // If addItem returned with errors, drop out
        if (output.warnings && output.warnings.length > 0)
        {
            return output;
        }

        // Remove items from slot, locationIndex remains
        const hideoutSlotIndex = hideoutArea.slots.findIndex(
            x => x.locationIndex === slotIndexToRemove
        );
        hideoutArea.slots[hideoutSlotIndex].item = undefined;

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
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        hideoutArea.active = body.enabled;

        return output;
    }

    static singleProductionStart(pmcData, body, sessionID)
    {
        // Start production
        HideoutController.registerProduction(pmcData, body, sessionID);
        // Find the recipe of the production
        const recipe = DatabaseServer.getTables().hideout.production.find(
            p => p._id === body.recipeId
        );
        // Find the actual amount of items we need to remove because body can send weird data
        const requirements = JsonUtil.clone(
            recipe.requirements.filter(i => i.type === "Item")
        );

        const output = ItemEventRouter.getOutput(sessionID);

        for (const itemToDelete of body.items)
        {
            const itemToCheck = pmcData.Inventory.items.find(
                i => i._id === itemToDelete.id
            );
            const requirement = requirements.find(
                requirement => requirement.templateId === itemToCheck._tpl
            );
            if (requirement.count <= 0) continue;
            InventoryHelper.removeItemByCount(
                pmcData,
                itemToDelete.id,
                requirement.count,
                sessionID,
                output
            );
            requirement.count -= itemToDelete.count;
        }

        return output;
    }

    /**
     * Handles event after clicking 'start' on the scav case hideout page
     * @param pmcData player profile
     * @param body client request object
     * @param sessionID session id
     * @returns item event router response
     */
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
                return HttpResponseUtil.appendErrorToOutput(output);
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

        const recipe = DatabaseServer.getTables().hideout.scavcase.find(
            r => r._id === body.recipeId
        );
        if (!recipe)
        {
            Logger.error(
                `Failed to find Scav Case recipe with id ${body.recipeId}`
            );
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        const rewards = ScavCaseRewardGenerator.generate(body);

        HideoutController.addScavCaseRewardsToProfile(pmcData, rewards);

        // @Important: Here we need to be very exact:
        // - normal recipe: Production time value is stored in attribute "productionType" with small "p"
        // - scav case recipe: Production time value is stored in attribute "ProductionType" with capital "P"
        pmcData.Hideout.Production[body.recipeId] =
            HideoutHelper.initProduction(body.recipeId, recipe.ProductionTime);

        return output;
    }

    /**
     * Add generated scav case rewards to player profile
     * @param pmcData player profile to add rewards to
     * @param rewards reward items to add to profile
     */
    static addScavCaseRewardsToProfile(pmcData, rewards)
    {
        pmcData.Hideout.Production["ScavCase"] = {
            Products: rewards,
        };
    }

    static continuousProductionStart(pmcData, body, sessionID)
    {
        HideoutController.registerProduction(pmcData, body, sessionID);
        return ItemEventRouter.getOutput(sessionID);
    }

    static takeProduction(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);

        if (body.recipeId === HideoutHelper.bitcoinFarm)
        {
            return HideoutHelper.getBTC(pmcData, body, sessionID);
        }

        const recipe = DatabaseServer.getTables().hideout.production.find(
            r => r._id === body.recipeId
        );
        if (recipe)
        {
            return HideoutController.handleRecipie(
                sessionID,
                recipe,
                pmcData,
                body,
                output
            );
        }

        const scavCase = DatabaseServer.getTables().hideout.scavcase.find(
            r => r._id === body.recipeId
        );
        if (scavCase)
        {
            return HideoutController.handleScavCase(
                sessionID,
                pmcData,
                body,
                output
            );
        }

        Logger.error(`Failed to locate any recipe with id ${body.recipeId}`);

        return HttpResponseUtil.appendErrorToOutput(output);
    }

    static handleRecipie(sessionID, recipe, pmcData, body, output)
    {
        //variables for managemnet of skill
        let craftingExpAmount = 0;

        // ? move the logic of BackendCounters in new method?
        let counterHoursCrafting =
            pmcData.BackendCounters[
                HideoutController.nameBackendCountersCrafting
            ];
        if (!counterHoursCrafting)
        {
            pmcData.BackendCounters[
                HideoutController.nameBackendCountersCrafting
            ] = { id: HideoutController.nameBackendCountersCrafting, value: 0 };
            counterHoursCrafting =
                pmcData.BackendCounters[
                    HideoutController.nameBackendCountersCrafting
                ];
        }
        let hoursCrafting = counterHoursCrafting.value;

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
            if (HideoutHelper.isProductionType(x[1]))
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
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        // check if the recipe is the same as the last one
        const area = pmcData.Hideout.Areas[recipe.areaType];

        if (area && body.recipeId !== area.lastRecipe)
        {
            // 1 point per craft upon the end of production for alternating between 2 different crafting recipes in the same module
            craftingExpAmount += 10;
        }

        // 1 point per 8 hours of crafting
        hoursCrafting += recipe.productionTime;
        if (hoursCrafting / HideoutConfig.hoursForSkillCrafting >= 1)
        {
            const multiplierCrafting = Math.floor(
                hoursCrafting / HideoutConfig.hoursForSkillCrafting
            );
            craftingExpAmount += 1 * multiplierCrafting;
            hoursCrafting -=
                HideoutConfig.hoursForSkillCrafting * multiplierCrafting;
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
                SkillTypes.HIDEOUT_MANAGEMENT,
                4
            );
            //manager Crafting skill
            if (craftingExpAmount > 0)
            {
                PlayerService.incrementSkillLevel(
                    pmcData,
                    output.profileChanges[sessionID],
                    SkillTypes.CRAFTING,
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

    /**
     * Handles giving rewards stored in player profile to player after clicking 'get rewards'
     * @param sessionID
     * @param pmcData
     * @param body
     * @param output
     * @returns
     */
    static handleScavCase(sessionID, pmcData, body, output)
    {
        const entries = Object.entries(pmcData.Hideout.Production);
        let prodId;
        for (const x of entries)
        {
            if (HideoutHelper.isProductionType(x[1]))
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
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        pmcData.Hideout.Production[prodId].Products =
            pmcData.Hideout.Production["ScavCase"].Products;

        const itemsToAdd = pmcData.Hideout.Production[prodId].Products.map(
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

    static registerProduction(pmcData, body, sessionID)
    {
        return HideoutHelper.registerProduction(pmcData, body, sessionID);
    }
}

module.exports = HideoutController;

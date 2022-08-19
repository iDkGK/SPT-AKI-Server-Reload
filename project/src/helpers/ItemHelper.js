"use strict";

require("../Lib.js");

class ItemHelper
{
    /**
     * Checks if a id is a valid item. Valid meaning that it's an item that be stored in stash
     * @param       {string}    tpl       the template id / tpl
     * @returns                             boolean; true for items that may be in player posession and not quest items
     */
    static isValidItem(tpl, invalidBaseTypes = undefined)
    {
        const defaultInvalidBaseTypes = [
            BaseClasses.LOOT_CONTAINER,
            BaseClasses.MOD_CONTAINER,
            BaseClasses.STASH,
            BaseClasses.SORTING_TABLE,
            BaseClasses.INVENTORY,
            BaseClasses.STATIONARY_CONTAINER,
            BaseClasses.POCKETS,
        ];

        if (invalidBaseTypes === undefined)
        {
            invalidBaseTypes = defaultInvalidBaseTypes;
        }

        const blacklist = [
            "5cffa483d7ad1a049e54ef1c", // mag_utes_ckib_nsv_belt_127x108_100
            "6087e570b998180e9f76dc24", // weapon_hultafors_db5000 Dead Blow Hammer
            "5d53f4b7a4b936793d58c780", // scope_ags_npz_pag17_2,7x
        ];
        const itemDetails = ItemHelper.getItem(tpl);

        if (!itemDetails[0])
        {
            return false;
        }

        // Is item valid
        return (
            !itemDetails[1]._props.QuestItem &&
            itemDetails[1]._type === "Item" &&
            invalidBaseTypes.every(x => !ItemHelper.isOfBaseclass(tpl, x)) &&
            ItemHelper.getItemPrice(tpl) > 0 &&
            blacklist.every(v => !ItemHelper.isOfBaseclass(tpl, v))
        );
    }

    /**
     * Checks if an id is a valid item. Valid meaning that it's an item that may be a reward
     * or content of bot loot. Items that are tested as valid may be in a player backpack or stash.
     * @param {*} tpl template id of item to check
     * @returns boolean: true if item is valid reward
     */
    static isValidRewardItem(tpl)
    {
        let valid = ItemHelper.isValidItem(tpl);
        if (!valid)
        {
            return valid; // not an item, drop out
        }

        valid =
            !ItemHelper.isOfBaseclass(tpl, BaseClasses.KEY) &&
            !ItemHelper.isOfBaseclass(tpl, BaseClasses.ARMBAND);

        return valid;
    }

    /**
     * Picks rewardable items from items.json. This means they need to fit into the inventory and they shouldn't be keys (debatable)
     * @returns     a list of rewardable items [[_tpl, itemTemplate],...]
     */
    static getRewardableItems()
    {
        // check for specific baseclasses which don't make sense as reward item
        // also check if the price is greater than 0; there are some items whose price can not be found
        // those are not in the game yet (e.g. AGS grenade launcher)
        return Object.entries(
            DatabaseServer.getTables().templates.items
        ).filter(([tpl, itemTemplate]) => ItemHelper.isValidRewardItem(tpl));
    }

    /**
     * Check if the tpl / template Id provided is a descendent of the baseclass
     *
     * @param   {string}    tpl             the item template id to check
     * @param   {string}    baseclassTpl    the baseclass to check for
     * @return  {boolean}                   is the tpl a descendent?
     */
    static isOfBaseclass(tpl, baseclassTpl)
    {
        return ItemHelper.doesItemOrParentsIdMatch(tpl, [baseclassTpl]);
    }

    /**
     * Returns the item price based on the handbook or as a fallback from the prices.json if the item is not
     * found in the handbook. If the price can't be found at all return 0
     *
     * @param {string}      tpl           the item template to check
     * @returns {integer}                   The price of the item or 0 if not found
     */
    static getItemPrice(tpl)
    {
        const handBookItem =
            DatabaseServer.getTables().templates.handbook.Items.find(
                x => x.Id === tpl
            );
        if (handBookItem)
        {
            return handBookItem.Price;
        }

        const dynamicPrice = DatabaseServer.getTables().templates.prices[tpl];
        if (dynamicPrice)
        {
            return dynamicPrice;
        }

        // we don't need to spam the logs as we know there are some items which are not priced yet
        // we check in ItemsHelper.getRewardableItems() for ItemPrice > 0, only then is it a valid
        // item to be given as reward or requested in a Completion quest
        //Logger.warning(`DailyQuest - No price found for tpl: ${tpl} price defaulting to 0`);
        return 0;
    }

    static fixItemStackCount(item)
    {
        if (item.upd === undefined)
        {
            item.upd = {
                StackObjectsCount: 1,
            };
        }

        if (item.upd.StackObjectsCount === undefined)
        {
            item.upd.StackObjectsCount = 1;
        }
        return item;
    }

    /**
     * AmmoBoxes contain StackSlots which need to be filled for the AmmoBox to have content.
     * Here's what a filled AmmoBox looks like:
     *   {
     *       "_id": "b1bbe982daa00ac841d4ae4d",
     *       "_tpl": "57372c89245977685d4159b1",
     *       "parentId": "5fe49a0e2694b0755a504876",
     *       "slotId": "hideout",
     *       "location": {
     *           "x": 3,
     *           "y": 4,
     *           "r": 0
     *       },
     *       "upd": {
     *           "StackObjectsCount": 1
     *       }
     *   },
     *   {
     *       "_id": "b997b4117199033afd274a06",
     *       "_tpl": "56dff061d2720bb5668b4567",
     *       "parentId": "b1bbe982daa00ac841d4ae4d",
     *       "slotId": "cartridges",
     *       "location": 0,
     *       "upd": {
     *           "StackObjectsCount": 30
     *       }
     *   }
     * Given the AmmoBox Item (first object) this function generates the StackSlot (second object) and returns it.
     * StackSlots are only used for AmmoBoxes which only have one element in StackSlots. However, it seems to be generic
     * to possibly also have more than one StackSlot. As good as possible, without seeing items having more than one
     * StackSlot, this function takes account of this and creates and returns an array of StackSlotItems
     *
     * @param {object}      item            The item template of the AmmoBox as given in items.json
     * @param {string}      parentId        The id of the AmmoBox instance these StackSlotItems should be children of
     * @returns {array}                     The array of StackSlotItems
     */
    static generateItemsFromStackSlot(item, parentId)
    {
        const stackSlotItems = [];
        // This is a AmmoBox or something other with Stackslots (nothing exists yet beseids AmmoBoxes afaik)
        for (const stackSlot of item._props.StackSlots)
        {
            const slotId = stackSlot._name;
            const count = stackSlot._max_count;
            // those are all arrays. For AmmoBoxes it's only one element each so we take 0 hardcoded
            // not sure if at any point there will be more than one element - but what so take then?
            const ammoTpl = stackSlot._props.filters[0].Filter[0];
            if (ammoTpl)
            {
                const stackSlotItem = {
                    _id: HashUtil.generate(),
                    _tpl: ammoTpl,
                    parentId: parentId,
                    slotId: slotId,
                    location: 0,
                    upd: {
                        StackObjectsCount: count,
                    },
                };
                stackSlotItems.push(stackSlotItem);
            }
            else
            {
                Logger.warning(
                    `No ids found in Filter for StackSlot ${slotId} of Item ${item._id}.`
                );
            }
        }

        return stackSlotItems;
    }

    /**
     * Gets item data from items.json
     * @param tpl items template id to look up
     * @returns bool - is valid + template item object as array
     */
    static getItem(tpl)
    {
        // -> Gets item from <input: _tpl>
        if (tpl in DatabaseServer.getTables().templates.items)
        {
            return [true, DatabaseServer.getTables().templates.items[tpl]];
        }

        return [false, undefined];
    }

    /**
     * get normalized value (0-1) based on item condition
     * @param item
     * @returns number between 0 and 1
     */
    static getItemQualityModifier(item)
    {
        // Default to 100%
        let result = 1;

        if (item.upd)
        {
            const medkit = item.upd.MedKit ? item.upd.MedKit : null;
            const repairable = item.upd.Repairable ? item.upd.Repairable : null;
            const foodDrink = item.upd.FoodDrink ? item.upd.FoodDrink : null;
            const key = item.upd.Key ? item.upd.Key : null;
            const resource = item.upd.Resource ? item.upd.Resource : null;
            const repairKit = item.upd.RepairKit ? item.upd.RepairKit : null;

            const itemDetails = ItemHelper.getItem(item._tpl)[1];

            if (medkit)
            {
                // Meds
                result = medkit.HpResource / itemDetails._props.MaxHpResource;
            }
            else if (repairable)
            {
                result = ItemHelper.getRepairableItemQualityValue(
                    itemDetails,
                    repairable,
                    item
                );
            }
            else if (foodDrink)
            {
                // food & drink
                result = foodDrink.HpPercent / itemDetails._props.MaxResource;
            }
            else if (key && key.NumberOfUsages > 0)
            {
                // keys - keys count upwards, not down like everything else
                const maxNumOfUsages = itemDetails._props.MaximumNumberOfUsage;
                result = (maxNumOfUsages - key.NumberOfUsages) / maxNumOfUsages;
            }
            else if (resource && resource.UnitsConsumed > 0)
            {
                // Things like fuel tank
                result =
                    resource.UnitsConsumed / itemDetails._props.MaxResource;
            }
            else if (repairKit)
            {
                // Repair kits
                result =
                    repairKit.Resource / itemDetails._props.MaxRepairResource;
            }

            if (result === 0)
            {
                // make item non-zero but still very low
                result = 0.01;
            }
        }

        return result;
    }

    /**
     * Get a quality value based on a repairable items (weapon/armor) current state between current and max durability
     * @param itemDetails
     * @param repairable repairable object
     * @param item
     * @returns a number between 0 and 1
     */
    static getRepairableItemQualityValue(itemDetails, repairable, item)
    {
        // Armor
        if (itemDetails._props.armorClass)
        {
            return repairable.Durability / itemDetails._props.MaxDurability;
        }
        else
        {
            // Weapon
            // Get max dura from props, if it isnt there use repairable max dura value
            const maxDurability = itemDetails._props.MaxDurability
                ? itemDetails._props.MaxDurability
                : repairable.MaxDurability;
            const durability = repairable.Durability / maxDurability;

            if (!durability)
            {
                Logger.error(
                    `weapon tpl: ${item._tpl} durability value failed in getRepairableItemQualityValue()`
                );
                return 1;
            }

            return Math.sqrt(durability);
        }
    }

    /**
     * Recursive function that looks at every item from parameter and gets their childrens Ids
     * @param items
     * @param itemID
     * @returns an array of strings
     */
    static findAndReturnChildrenByItems(items, itemID)
    {
        const list = [];

        for (const childitem of items)
        {
            if (childitem.parentId === itemID)
            {
                list.push(
                    ...ItemHelper.findAndReturnChildrenByItems(
                        items,
                        childitem._id
                    )
                );
            }
        }

        list.push(itemID); // required
        return list;
    }

    /**
     * A variant of findAndReturnChildren where the output is list of item objects instead of their ids.
     * @param items
     * @param baseItemId
     * @returns An array of Item objects
     */
    static findAndReturnChildrenAsItems(items, baseItemId)
    {
        const list = [];

        for (const childItem of items)
        {
            // Include itself.
            if (childItem._id === baseItemId)
            {
                list.unshift(childItem);
                continue;
            }

            if (
                childItem.parentId === baseItemId &&
                !list.find(item => childItem._id === item._id)
            )
            {
                list.push(
                    ...ItemHelper.findAndReturnChildrenAsItems(
                        items,
                        childItem._id
                    )
                );
            }
        }
        return list;
    }

    /**
     * Find children of the item in a given assort (weapons parts for example, need recursive loop function)
     * @param itemIdToFind Template id of item to check for
     * @param assort Array of items to check in
     * @returns Array of children of requested item
     */
    static findAndReturnChildrenByAssort(itemIdToFind, assort)
    {
        let list = [];

        for (const itemFromAssort of assort)
        {
            if (
                itemFromAssort.parentId === itemIdToFind &&
                !list.find(item => itemFromAssort._id === item._id)
            )
            {
                list.push(itemFromAssort);
                list = list.concat(
                    ItemHelper.findAndReturnChildrenByAssort(
                        itemFromAssort._id,
                        assort
                    )
                );
            }
        }

        return list;
    }

    /**
     * Check if the passed in item has buy count restrictions
     * @param itemToCheck Item to check
     * @returns true if it has buy restrictions
     */
    static hasBuyRestrictions(itemToCheck)
    {
        if (
            itemToCheck.upd.BuyRestrictionCurrent !== undefined &&
            itemToCheck.upd.BuyRestrictionMax !== undefined
        )
        {
            return true;
        }

        return false;
    }

    /**
     * is the passed in template id a dog tag
     * @param tpl Template id to check
     * @returns true if it is a dogtag
     */
    static isDogtag(tpl)
    {
        return (
            tpl === BaseClasses.DOG_TAG_BEAR || tpl === BaseClasses.DOG_TAG_USEC
        );
    }

    /**
     * Can the item passed in be sold to a trader because it is raw money
     * @param tpl Item template id to check
     * @returns true if unsellable
     */
    static isNotSellable(tpl)
    {
        const items = [
            "544901bf4bdc2ddf018b456d", //wad of rubles
            Money.ROUBLES,
            Money.EUROS,
            Money.DOLLARS,
        ];

        return items.includes(tpl);
    }

    /**
     * Gets the identifier for a child using slotId, locationX and locationY.
     * @param item
     * @returns "slotId OR slotid,locationX,locationY"
     */
    static getChildId(item)
    {
        if (!("location" in item))
        {
            return item.slotId;
        }

        return `${item.slotId},${item.location.x},${item.location.y}`;
    }

    /**
     * Can the pased in item be stacked
     * @param tpl item to check
     * @returns true if it can be stacked
     */
    static isItemTplStackable(tpl)
    {
        return (
            DatabaseServer.getTables().templates.items[tpl]._props
                .StackMaxSize > 1
        );
    }

    /**
     * split item stack if it exceeds StackMaxSize
     */
    static splitStack(item)
    {
        if (!("upd" in item) || !("StackObjectsCount" in item.upd))
        {
            return [item];
        }

        const maxStack =
            DatabaseServer.getTables().templates.items[item._tpl]._props
                .StackMaxSize;
        let count = item.upd.StackObjectsCount;
        const stacks = [];

        // If the current count is already equal or less than the max
        // then just return the item as is.
        if (count <= maxStack)
        {
            stacks.push(JsonUtil.clone(item));
            return stacks;
        }

        while (count)
        {
            const amount = Math.min(count, maxStack);
            const newStack = JsonUtil.clone(item);

            newStack._id = HashUtil.generate();
            newStack.upd.StackObjectsCount = amount;
            count -= amount;
            stacks.push(newStack);
        }

        return stacks;
    }

    /**
     * Find Barter items in the inventory
     * @param {string} by
     * @param {Object} pmcData
     * @param {string} barterItemId
     * @returns Array of Item objects
     */
    static findBarterItems(by, pmcData, barterItemId)
    {
        // find required items to take after buying (handles multiple items)
        const barterIDs =
            typeof barterItemId === "string" ? [barterItemId] : barterItemId;
        let itemsArray = [];

        for (const barterID of barterIDs)
        {
            const filterResult = pmcData.Inventory.items.filter(item =>
            {
                return by === "tpl"
                    ? item._tpl === barterID
                    : item._id === barterID;
            });

            itemsArray = Object.assign(itemsArray, filterResult);
        }

        return itemsArray;
    }

    /**
     *
     * @param pmcData
     * @param items
     * @param insuredItems insured items to not replace ids for
     * @param fastPanel
     * @returns
     */
    static replaceIDs(pmcData, items, insuredItems = undefined, fastPanel = undefined)
    {
        // replace bsg shit long ID with proper one
        let serialisedInventory = JsonUtil.serialize(items);

        for (const item of items)
        {
            if (pmcData !== undefined)
            {
                // Insured items shouldn't be renamed
                // only works for pmcs.
                if (
                    insuredItems &&
                    insuredItems.find(
                        insuredItem => insuredItem.itemId === item._id
                    )
                )
                {
                    continue;
                }

                // Do not replace important ID's
                if (
                    item._id === pmcData.Inventory.equipment ||
                    item._id === pmcData.Inventory.questRaidItems ||
                    item._id === pmcData.Inventory.questStashItems ||
                    item._id === pmcData.Inventory.sortingTable ||
                    item._id === pmcData.Inventory.stash
                )
                {
                    continue;
                }
            }

            // replace id
            const oldId = item._id;
            const newId = HashUtil.generate();

            serialisedInventory = serialisedInventory.replace(
                new RegExp(oldId, "g"),
                newId
            );

            // Also replace in quick slot if the old ID exists.
            if (fastPanel !== undefined)
            {
                for (const itemSlot in fastPanel)
                {
                    if (fastPanel[itemSlot] === oldId)
                    {
                        fastPanel[itemSlot] = fastPanel[itemSlot].replace(
                            new RegExp(oldId, "g"),
                            newId
                        );
                    }
                }
            }
        }

        items = JsonUtil.deserialize(serialisedInventory);

        // fix duplicate id's
        const dupes = {};
        const newParents = {};
        const childrenMapping = {};
        const oldToNewIds = {};

        // Finding duplicate IDs involves scanning the item three times.
        // First scan - Check which ids are duplicated.
        // Second scan - Map parents to items.
        // Third scan - Resolve IDs.
        for (const item of items)
        {
            dupes[item._id] = (dupes[item._id] || 0) + 1;
        }

        for (const item of items)
        {
            // register the parents
            if (dupes[item._id] > 1)
            {
                const newId = HashUtil.generate();

                newParents[item.parentId] = newParents[item.parentId] || [];
                newParents[item.parentId].push(item);
                oldToNewIds[item._id] = oldToNewIds[item._id] || [];
                oldToNewIds[item._id].push(newId);
            }
        }

        for (const item of items)
        {
            if (dupes[item._id] > 1)
            {
                const oldId = item._id;
                const newId = oldToNewIds[oldId].splice(0, 1)[0];
                item._id = newId;

                // Extract one of the children that's also duplicated.
                if (oldId in newParents && newParents[oldId].length > 0)
                {
                    childrenMapping[newId] = {};
                    for (const childIndex in newParents[oldId])
                    {
                        // Make sure we haven't already assigned another duplicate child of
                        // same slot and location to this parent.
                        const childId = ItemHelper.getChildId(
                            newParents[oldId][childIndex]
                        );

                        if (!(childId in childrenMapping[newId]))
                        {
                            childrenMapping[newId][childId] = 1;
                            newParents[oldId][childIndex].parentId = newId;
                            // Some very fucking sketchy stuff on this childIndex
                            // No clue wth was that childIndex supposed to be, but its not
                            newParents[oldId].splice(
                                Number.parseInt(childIndex),
                                1
                            );
                        }
                    }
                }
            }
        }

        return items;
    }

    /**
     * Recursivly loop down through an items hierarchy to see if any of the ids match the supplied list, return true if any do
     * @param {string} tpl
     * @param {Array} tplsToCheck
     * @returns boolean
     */
    static doesItemOrParentsIdMatch(tpl, tplsToCheck)
    {
        const itemDetails = ItemHelper.getItem(tpl);
        const itemExists = itemDetails[0];
        const item = itemDetails[1];

        // not an item, drop out
        if (!itemExists)
        {
            return false;
        }

        // no parent to check
        if (!item._parent)
        {
            return false;
        }

        // Does templateId match any values in tplsToCheck array
        if (tplsToCheck.includes(item._id))
        {
            return true;
        }

        // Does the items parent type exist in tplsToCheck array
        if (tplsToCheck.includes(item._parent))
        {
            return true;
        }

        // check items parent with same method
        return ItemHelper.doesItemOrParentsIdMatch(item._parent, tplsToCheck);
    }

    /**
     * Return true if item is a quest item
     * @param {string} tpl
     * @returns boolean
     */
    static isQuestItem(tpl)
    {
        const itemDetails = ItemHelper.getItem(tpl);
        if (itemDetails[0] && itemDetails[1]._props.QuestItem)
        {
            return true;
        }

        return false;
    }

    /**
     * Get the inventory size of an item
     * @param items
     * @param rootItemId
     * @returns ItemSize object (width and height)
     */
    static getItemSize(items, rootItemId)
    {
        const rootTemplate = ItemHelper.getItem(
            items.filter(x => x._id === rootItemId)[0]._tpl
        )[1];
        const width = rootTemplate._props.Width;
        const height = rootTemplate._props.Height;

        let sizeUp = 0;
        let sizeDown = 0;
        let sizeLeft = 0;
        let sizeRight = 0;

        let forcedUp = 0;
        let forcedDown = 0;
        let forcedLeft = 0;
        let forcedRight = 0;

        const children = ItemHelper.findAndReturnChildrenAsItems(
            items,
            rootItemId
        );
        for (const ci of children)
        {
            const itemTemplate = ItemHelper.getItem(ci._tpl)[1];

            // Calculating child ExtraSize
            if (itemTemplate._props.ExtraSizeForceAdd === true)
            {
                forcedUp += itemTemplate._props.ExtraSizeUp;
                forcedDown += itemTemplate._props.ExtraSizeDown;
                forcedLeft += itemTemplate._props.ExtraSizeLeft;
                forcedRight += itemTemplate._props.ExtraSizeRight;
            }
            else
            {
                sizeUp =
                    sizeUp < itemTemplate._props.ExtraSizeUp
                        ? itemTemplate._props.ExtraSizeUp
                        : sizeUp;
                sizeDown =
                    sizeDown < itemTemplate._props.ExtraSizeDown
                        ? itemTemplate._props.ExtraSizeDown
                        : sizeDown;
                sizeLeft =
                    sizeLeft < itemTemplate._props.ExtraSizeLeft
                        ? itemTemplate._props.ExtraSizeLeft
                        : sizeLeft;
                sizeRight =
                    sizeRight < itemTemplate._props.ExtraSizeRight
                        ? itemTemplate._props.ExtraSizeRight
                        : sizeRight;
            }
        }

        return {
            width: width + sizeLeft + sizeRight + forcedLeft + forcedRight,
            height: height + sizeUp + sizeDown + forcedUp + forcedDown,
        };
    }
}

module.exports = ItemHelper;

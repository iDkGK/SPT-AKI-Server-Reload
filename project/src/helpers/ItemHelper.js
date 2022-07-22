"use strict";

require("../Lib.js");

class ItemHelper
{
    static get BASECLASS()
    {
        return {
            "Weapon": "5422acb9af1c889c16000029",
            "Armor": "5448e54d4bdc2dcc718b4568",
            "Vest": "5448e5284bdc2dcb718b4567",
            "Backpack": "5448e53e4bdc2d60728b4567",
            "Visors": "5448e5724bdc2ddf718b4568",
            "Food": "5448e8d04bdc2ddf718b4569",
            "Drink": "5448e8d64bdc2dce718b4568",
            "BarterItem": "5448eb774bdc2d0a728b4567",
            "Info": "5448ecbe4bdc2d60728b4568",
            "MedKit": "5448f39d4bdc2d0a728b4568",
            "Drugs": "5448f3a14bdc2d27728b4569",
            "Stimulator": "5448f3a64bdc2d60728b456a",
            "Medical": "5448f3ac4bdc2dce718b4569",
            "MedicalSupplies": "57864c8c245977548867e7f1",
            "Mod": "5448fe124bdc2da5018b4567",
            "FunctionalMod": "550aa4154bdc2dd8348b456b",
            "Fuel": "5d650c3e815116009f6201d2",
            "GearMod": "55802f3e4bdc2de7118b4584",
            "Stock": "55818a594bdc2db9688b456a",
            "Foregrip": "55818af64bdc2d5b648b4570",
            "MasterMod": "55802f4a4bdc2ddb688b4569",
            "Mount": "55818b224bdc2dde698b456f",
            "Muzzle": "5448fe394bdc2d0d028b456c",
            "Sights": "5448fe7a4bdc2d6f028b456b",
            "Meds": "543be5664bdc2dd4348b4569",
            "Money": "543be5dd4bdc2deb348b4569",
            "Key": "543be5e94bdc2df1348b4568",
            "KeyMechanical": "5c99f98d86f7745c314214b3",
            "Keycard": "5c164d2286f774194c5e69fa",
            "Equipment": "543be5f84bdc2dd4348b456a",
            "ThrowWeap": "543be6564bdc2df4348b4568",
            "FoodDrink": "543be6674bdc2df1348b4569",
            "Pistol": "5447b5cf4bdc2d65278b4567",
            "Smg": "5447b5e04bdc2d62278b4567",
            "AssaultRifle": "5447b5f14bdc2d61278b4567",
            "AssaultCarbine": "5447b5fc4bdc2d87278b4567",
            "Shotgun": "5447b6094bdc2dc3278b4567",
            "MarksmanRifle": "5447b6194bdc2d67278b4567",
            "SniperRifle": "5447b6254bdc2dc3278b4568",
            "MachineGun": "5447bed64bdc2d97278b4568",
            "GrenadeLauncher": "5447bedf4bdc2d87278b4568",
            "SpecialWeapon": "5447bee84bdc2dc3278b4569",
            "SpecItem": "5447e0e74bdc2d3c308b4567",
            "Knife": "5447e1d04bdc2dff2f8b4567",
            "Ammo": "5485a8684bdc2da71d8b4567",
            "AmmoBox": "543be5cb4bdc2deb348b4568",
            "LootContainer": "566965d44bdc2d814c8b4571",
            "MobContainer": "5448bf274bdc2dfc2f8b456a",
            "SearchableItem": "566168634bdc2d144c8b456c",
            "Stash": "566abbb64bdc2d144c8b457d",
            "SortingTable": "6050cac987d3f925bf016837",
            "LockableContainer": "5671435f4bdc2d96058b4569",
            "SimpleContainer": "5795f317245977243854e041",
            "Inventory": "55d720f24bdc2d88028b456d",
            "StationaryContainer": "567583764bdc2d98058b456e",
            "Pockets": "557596e64bdc2dc2118b4571",
            "Armband": "5b3f15d486f77432d0509248",
            "DogTagUsec": "59f32c3b86f77472a31742f0",
            "DogTagBear": "59f32bb586f774757e1e8442",
            "Jewelry": "57864a3d24597754843f8721",
            "Electronics": "57864a66245977548f04a81f",
            "BuildingMaterial": "57864ada245977548638de91",
            "Tool": "57864bb7245977548b3b66c2",
            "HouseholdGoods": "57864c322459775490116fbf",
            "Lubricant": "57864e4c24597754843f8723",
            "Battery": "57864ee62459775490116fc1",
            "AssaultScope": "55818add4bdc2d5b648b456f",
            "ReflexSight": "55818ad54bdc2ddc698b4569",
            "TacticalCombo": "55818b164bdc2ddc698b456c",
            "Magazine": "5448bc234bdc2d3c308b4569",
            "LightLaser": "55818b0e4bdc2dde698b456e",
            "FlashHider": "550aa4bf4bdc2dd6348b456b",
            "Collimator": "55818ad54bdc2ddc698b4569",
            "CompactCollimator": "55818acf4bdc2dde698b456b",
            "Compensator": "550aa4af4bdc2dd4348b456e",
            "OpticScope": "55818ae44bdc2dde698b456c",
            "SpecialScope": "55818aeb4bdc2ddc698b456a",
            "Other": "590c745b86f7743cc433c5f2",
            "Silencer": "550aa4cd4bdc2dd8348b456c",
            "PortableRangeFinder": "61605ddea09d851a0a0c1bbc",
            "Item": "54009119af1c881c07000029",
            "CylinderMagazine": "610720f290b75a49ff2e5e25"
        };
    }

    static get MONEY()
    {
        return {
            "Roubles": "5449016a4bdc2d6f028b456f",
            "Euros": "569668774bdc2da2298b4568",
            "Dollars": "5696686a4bdc2da3298b456a"
        };
    }

    /**
     * Checks if a id is a valid item. Valid meaning that it's an item that be stored in stash
     * @param       {string}    tpl       the template id / tpl
     * @returns                             boolean; true for items that may be in player posession and not quest items
     */
    static isValidItem(tpl)
    {
        const blacklist = [
            "5cffa483d7ad1a049e54ef1c", // mag_utes_ckib_nsv_belt_127x108_100
            "6087e570b998180e9f76dc24", // weapon_hultafors_db5000 Dead Blow Hammer
            "5d53f4b7a4b936793d58c780"  // scope_ags_npz_pag17_2,7x
        ];
        const itemDetails = ItemHelper.getItem(tpl);

        if (!itemDetails[0])
        {
            return false;
        }

        const valid =  !itemDetails[1]._props.QuestItem
                    && itemDetails[1]._type === "Item"
                    && !ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.LootContainer)
                    && !ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.MobContainer)
                    && !ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.Stash)
                    && !ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.SortingTable)
                    && !ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.Inventory)
                    && !ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.StationaryContainer)
                    && !ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.Pockets)
                    && ItemHelper.getItemPrice(tpl) > 0
                    && blacklist.every(v => !ItemHelper.isOfBaseclass(tpl, v));

        return valid;
    }

    /**
     * Checks if a id is a valid item. Valid meaning that it's an item that may be a reward
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

        valid =  !ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.Key)
                    && !ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.Armband);

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
        const rewardableItems = Object.entries(DatabaseServer.tables.templates.items).filter(
            ([ tpl, itemTemplate ]) => ItemHelper.isValidRewardItem(tpl)
        );
        return rewardableItems;
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
        return ItemHelper.doesItemOrParentsIdMatch(tpl, baseclassTpl);
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
        const handBookItem = DatabaseServer.tables.templates.handbook.Items.find(x =>
        {
            x.Id === tpl;
        });

        if (handBookItem)
        {
            return handBookItem.price;
        }

        const dynamicPrice = DatabaseServer.tables.templates.prices[tpl];
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
                StackObjectsCount: 1
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
    static generateStackSlotItems(item, parentId)
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
                    "_id": HashUtil.generate(),
                    "_tpl": ammoTpl,
                    "parentId": parentId,
                    "slotId": slotId,
                    "location": 0,
                    "upd": {
                        "StackObjectsCount": count
                    }
                };
                stackSlotItems.push(stackSlotItem);
            }
            else
            {
                Logger.warning(`No ids found in Filter for StackSlot ${slotId} of Item ${item._id}.`);
            }
        }
        return stackSlotItems;
    }

    /* Gets item data from items.json
    * */
    static getItem(tpl)
    {
        // -> Gets item from <input: _tpl>
        if (tpl in DatabaseServer.tables.templates.items)
        {
            return [true, DatabaseServer.tables.templates.items[tpl]];
        }

        return [false, {}];
    }

    // get normalized value (0-1) based on item condition
    static getItemQualityModifier(item)
    {
        let result = 1;

        if (item.upd)
        {
            const medkit = (item.upd.MedKit) ? item.upd.MedKit : null;
            const repairable = (item.upd.Repairable) ? item.upd.Repairable : null;

            if (medkit)
            {
                // meds
                result = medkit.HpResource / ItemHelper.getItem(item._tpl)[1]._props.MaxHpResource;
            }

            if (repairable)
            {
                const itemDetails = ItemHelper.getItem(item._tpl)[1];

                // Armour
                if (itemDetails._props.armorClass)
                {
                    result = repairable.Durability / repairable.MaxDurability;
                }
                else
                {
                    // Weapon
                    const durability = repairable.Durability / repairable.MaxDurability;
                    result = Math.sqrt(durability);
                }
            }

            if (result === 0)
            {
                // make item cheap
                result = 0.01;
            }
        }

        return result;
    }

    static findAndReturnChildrenByItems(items, itemID)
    {
        const list = [];

        for (const childitem of items)
        {
            if (childitem.parentId === itemID)
            {
                list.push.apply(list, ItemHelper.findAndReturnChildrenByItems(items, childitem._id));
            }
        }

        list.push(itemID);// it's required
        return list;
    }

    /**
     * A variant of findAndReturnChildren where the output is list of item objects instead of their ids.
     */
    static findAndReturnChildrenAsItems(items, itemID)
    {
        const list = [];

        for (const childitem of items)
        {
            // Include itself.
            if (childitem._id === itemID)
            {
                list.unshift(childitem);
                continue;
            }

            if (childitem.parentId === itemID && !list.find(item => childitem._id === item._id))
            {
                list.push.apply(list, ItemHelper.findAndReturnChildrenAsItems(items, childitem._id));
            }
        }
        return list;
    }

    /**
     * find childs of the item in a given assort (weapons pars for example, need recursive loop function)
     */
    static findAndReturnChildrenByAssort(itemIdToFind, assort)
    {
        let list = [];

        for (const itemFromAssort of assort)
        {
            if (itemFromAssort.parentId === itemIdToFind && !list.find(item => itemFromAssort._id === item._id))
            {
                list.push(itemFromAssort);
                list = list.concat(ItemHelper.findAndReturnChildrenByAssort(itemFromAssort._id, assort));
            }
        }

        return list;
    }

    /**
     * Is Dogtag
     * Checks if an item is a dogtag. Used under profile_f.js to modify preparePrice based
     * on the level of the dogtag
     */
    static isDogtag(tpl)
    {
        return tpl === ItemHelper.BASECLASS.DogTagBear || tpl === ItemHelper.BASECLASS.DogTagUsec;
    }

    static isNotSellable(tpl)
    {
        const items = [
            "544901bf4bdc2ddf018b456d", //wad of rubles
            ItemHelper.MONEY.Roubles,
            ItemHelper.MONEY.Euros,
            ItemHelper.MONEY.Dollars
        ];

        return items.includes(tpl);
    }

    /* Gets the identifier for a child using slotId, locationX and locationY. */
    static getChildId(item)
    {
        if (!("location" in item))
        {
            return item.slotId;
        }
        return `${item.slotId},${item.location.x},${item.location.y}`;
    }

    static isItemTplStackable(tpl)
    {
        return DatabaseServer.tables.templates.items[tpl]._props.StackMaxSize > 1;
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

        const maxStack = DatabaseServer.tables.templates.items[item._tpl]._props.StackMaxSize;
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
     * @param {string} barter_itemID
     * @returns Array
     */
    static findBarterItems(by, pmcData, barter_itemID)
    { // find required items to take after buying (handles multiple items)
        const barterIDs = typeof barter_itemID === "string" ? [barter_itemID] : barter_itemID;
        let itemsArray = [];

        for (const barterID of barterIDs)
        {
            const filterResult = pmcData.Inventory.items.filter(item =>
            {
                return by === "tpl" ? (item._tpl === barterID) : (item._id === barterID);
            });
            itemsArray = Object.assign(itemsArray, filterResult);
        }
        return itemsArray;
    }

    /**
     * @param {Object} pmcData
     * @param {Array} items
     * @param {Object} fastPanel
     * @returns Array
     */
    static replaceIDs(pmcData, items, insuredItems = null, fastPanel = null)
    {
        // replace bsg shit long ID with proper one
        let string_inventory = JsonUtil.serialize(items);

        for (const item of items)
        {
            if (pmcData !== null)
            {
                // insured items shouldn't be renamed
                // only works for pmcs.
                if (insuredItems && insuredItems.find(insuredItem => insuredItem.itemId === item._id))
                {
                    continue;
                }

                // do not replace important ID's
                if (item._id === pmcData.Inventory.equipment
                    || item._id === pmcData.Inventory.questRaidItems
                    || item._id === pmcData.Inventory.questStashItems
                    || item._id === pmcData.Inventory.sortingTable
                    || item._id === pmcData.Inventory.stash)
                {
                    continue;
                }
            }

            // replace id
            const old_id = item._id;
            const new_id = HashUtil.generate();

            string_inventory = string_inventory.replace(new RegExp(old_id, "g"), new_id);

            // Also replace in quick slot if the old ID exists.
            if (fastPanel !== null)
            {
                for (const itemSlot in fastPanel)
                {
                    if (fastPanel[itemSlot] === old_id)
                    {
                        fastPanel[itemSlot] = fastPanel[itemSlot].replace(new RegExp(old_id, "g"), new_id);
                    }
                }
            }
        }

        items = JsonUtil.deserialize(string_inventory);

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
                        const childId = ItemHelper.getChildId(newParents[oldId][childIndex]);

                        if (!(childId in childrenMapping[newId]))
                        {
                            childrenMapping[newId][childId] = 1;
                            newParents[oldId][childIndex].parentId = newId;
                            newParents[oldId].splice(childIndex, 1);
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
        const itemDetails = this.getItem(tpl);
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
        return this.doesItemOrParentsIdMatch(item._parent, tplsToCheck);
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


    static getItemSize(items, rootItemId)
    {
        const rootTemplate = ItemHelper.getItem(items.filter(x => x._id === rootItemId)[0]._tpl)[1];
        const width = rootTemplate._props.Width;
        const height = rootTemplate._props.Height;

        let SizeUp = 0;
        let SizeDown = 0;
        let SizeLeft = 0;
        let SizeRight = 0;

        let ForcedUp = 0;
        let ForcedDown = 0;
        let ForcedLeft = 0;
        let ForcedRight = 0;

        const children = ItemHelper.findAndReturnChildrenAsItems(items, rootItemId);
        for (const ci of children)
        {
            const itemTemplate = ItemHelper.getItem(ci._tpl)[1];

            // Calculating child ExtraSize
            if (itemTemplate._props.ExtraSizeForceAdd === true)
            {
                ForcedUp += itemTemplate._props.ExtraSizeUp;
                ForcedDown += itemTemplate._props.ExtraSizeDown;
                ForcedLeft += itemTemplate._props.ExtraSizeLeft;
                ForcedRight += itemTemplate._props.ExtraSizeRight;
            }
            else
            {
                SizeUp = SizeUp < itemTemplate._props.ExtraSizeUp ? itemTemplate._props.ExtraSizeUp : SizeUp;
                SizeDown = SizeDown < itemTemplate._props.ExtraSizeDown ? itemTemplate._props.ExtraSizeDown : SizeDown;
                SizeLeft = SizeLeft < itemTemplate._props.ExtraSizeLeft ? itemTemplate._props.ExtraSizeLeft : SizeLeft;
                SizeRight = SizeRight < itemTemplate._props.ExtraSizeRight ? itemTemplate._props.ExtraSizeRight : SizeRight;
            }

        }

        return {
            "width": width + SizeLeft + SizeRight + ForcedLeft + ForcedRight,
            "height":  height + SizeUp + SizeDown + ForcedUp + ForcedDown
        };

    }
}

module.exports = ItemHelper;

"use strict";

require("../Lib.js");

class InventoryController
{
    /**
     * Based on the item action, determine whose inventories we should be looking at for from and to.
     *
     * @param {Object} body - request Body
     * @param {string} sessionID - Session id
     * @returns response as JSON object
     */
    static getOwnerInventoryItems(body, sessionID)
    {
        let isSameInventory = false;
        const pmcItems = ProfileHelper.getPmcProfile(sessionID).Inventory.items;
        const scavData = ProfileHelper.getScavProfile(sessionID);
        let fromInventoryItems = pmcItems;
        let fromType = "pmc";

        if ("fromOwner" in body)
        {
            if (body.fromOwner.id === scavData._id)
            {
                fromInventoryItems = scavData.Inventory.items;
                fromType = "scav";
            }
            else if (body.fromOwner.type.toLocaleLowerCase() === "mail")
            {
                fromInventoryItems = DialogueHelper.getMessageItemContents(
                    body.fromOwner.id,
                    sessionID
                );
                fromType = "mail";
            }
        }

        // Don't need to worry about mail for destination because client doesn't allow
        // users to move items back into the mail stash.
        let toInventoryItems = pmcItems;
        let toType = "pmc";

        if ("toOwner" in body && body.toOwner.id === scavData._id)
        {
            toInventoryItems = scavData.Inventory.items;
            toType = "scav";
        }

        if (fromType === toType)
        {
            isSameInventory = true;
        }

        return {
            from: fromInventoryItems,
            to: toInventoryItems,
            sameInventory: isSameInventory,
            isMail: fromType === "mail",
        };
    }

    /**
     * Move Item
     * change location of item with parentId and slotId
     * transfers items from one profile to another if fromOwner/toOwner is set in the body.
     * otherwise, move is contained within the same profile_f.
     *
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns
     */
    static moveItem(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        const items = InventoryController.getOwnerInventoryItems(
            body,
            sessionID
        );

        if (items.sameInventory)
        {
            InventoryController.moveItemInternal(items.from, body);
        }
        else
        {
            InventoryController.moveItemToProfile(items.from, items.to, body);
        }
        return output;
    }

    /**
     * Internal helper function to transfer an item from one profile to another.
     * fromProfileData: Profile of the source.
     * toProfileData: Profile of the destination.
     * body: Move request
     *
     * @param {Array} fromItems
     * @param {Array} toItems
     * @param {Object} body
     */
    static moveItemToProfile(fromItems, toItems, body)
    {
        InventoryController.handleCartridges(fromItems, body);

        const idsToMove = ItemHelper.findAndReturnChildrenByItems(
            fromItems,
            body.item
        );

        for (const itemId of idsToMove)
        {
            for (const itemIndex in fromItems)
            {
                if (
                    fromItems[itemIndex]._id &&
                    fromItems[itemIndex]._id === itemId
                )
                {
                    if (itemId === body.item)
                    {
                        fromItems[itemIndex].parentId = body.to.id;
                        fromItems[itemIndex].slotId = body.to.container;

                        if ("location" in body.to)
                        {
                            fromItems[itemIndex].location = body.to.location;
                        }
                        else
                        {
                            if (fromItems[itemIndex].location)
                            {
                                delete fromItems[itemIndex].location;
                            }
                        }
                    }
                    toItems.push(fromItems[itemIndex]);
                    fromItems.splice(parseInt(itemIndex), 1);
                }
            }
        }
    }

    /**
     * Internal helper function to move item within the same profile_f.
     *
     * @param {Object} inventoryItems - Inventory items
     * @param {Object} body - Request body
     */
    static moveItemInternal(inventoryItems, body)
    {
        InventoryController.handleCartridges(inventoryItems, body);

        for (const inventoryItem of inventoryItems)
        {
            // Find item we want to 'move'
            if (inventoryItem._id && inventoryItem._id === body.item)
            {
                Logger.debug(
                    `${body.Action} item: ${body.item} from slotid: ${inventoryItem.slotId} to container: ${body.to.container}`
                );

                // don't move shells from camora to cartridges (happens when loading shells into mts-255 revolver shotgun)
                if (
                    inventoryItem.slotId.includes("camora_") &&
                    body.to.container === "cartridges"
                )
                {
                    Logger.warning(
                        `tried to update item with slotid: ${inventoryItem.slotId} to ${body.to.container}, profile corruption prevented`
                    );
                    return;
                }

                // Edit items details to match its new location
                inventoryItem.parentId = body.to.id;
                inventoryItem.slotId = body.to.container;

                if ("location" in body.to)
                {
                    inventoryItem.location = body.to.location;
                }
                else
                {
                    if (inventoryItem.location)
                    {
                        delete inventoryItem.location;
                    }
                }
                return;
            }
        }
    }

    /**
     * Internal helper function to handle cartridges in inventory if any of them exist.
     *
     * @param {Object} Items - Cartridges in question
     * @param {Object} body  - Body of the Move request
     */
    static handleCartridges(items, body)
    {
        // -> Move item to different place - counts with equiping filling magazine etc
        if (body.to.container === "cartridges")
        {
            let tmpCounter = 0;

            for (const itemAmmo in items)
            {
                if (body.to.id === items[itemAmmo].parentId)
                {
                    tmpCounter++;
                }
            }
            // wrong location for first cartrige
            body.to.location = tmpCounter;
        }
    }

    /**
     * Remove Item from Profile
     * Deep tree item deletion, also removes items from insurance list
     *
     * @param {Object} pmcData   - PMC Profile data as JSON Object
     * @param {string} itemId    - ID of the inventory Item to be removed
     * @param {string} sessionID - Session ID
     * @param {Object} [output=undefined]  - output object
     * @returns {Object} - returns output object
     */
    static removeItem(pmcData, itemId, sessionID, output = undefined)
    {
        return InventoryHelper.removeItem(pmcData, itemId, sessionID, output);
    }

    /**
     * Implements functionality "Discard" from Main menu (Stash etc.)
     * Removes item from PMC Profile
     *
     * @param {Object} pmcData - PMC Data portion of Profile Object
     * @param {Object} body - rquest body
     * @param {string} sessionID - session it
     * @returns response object
     */
    static discardItem(pmcData, body, sessionID)
    {
        return InventoryHelper.removeItem(
            pmcData,
            body.item,
            sessionID,
            ItemEventRouter.getOutput(sessionID)
        );
    }

    /**
     * Split Item
     * spliting 1 item-stack into 2 separate items ...
     *
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns
     */
    static splitItem(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        let location = body.container.location;

        const items = InventoryController.getOwnerInventoryItems(
            body,
            sessionID
        );

        if (
            !("location" in body.container) &&
            body.container.container === "cartridges"
        )
        {
            let tmpCounter = 0;

            for (const itemAmmo in items.to)
            {
                if (items.to[itemAmmo].parentId === body.container.id)
                {
                    tmpCounter++;
                }
            }

            location = tmpCounter; // wrong location for first cartrige
        }

        // The item being merged is possible from three different sources: pmc, scav, or mail.
        for (const item of items.from)
        {
            if (item._id && item._id === body.item)
            {
                item.upd.StackObjectsCount -= body.count;

                const newItemId = HashUtil.generate();

                output.profileChanges[sessionID].items.new.push({
                    _id: newItemId,
                    _tpl: item._tpl,
                    upd: { StackObjectsCount: body.count },
                });

                items.to.push({
                    _id: newItemId,
                    _tpl: item._tpl,
                    parentId: body.container.id,
                    slotId: body.container.container,
                    location: location,
                    upd: { StackObjectsCount: body.count },
                });

                return output;
            }
        }

        return {
            warnings: [],
            profileChanges: {},
        };
    }

    /**
     * Merge Item
     * merges 2 items into one, deletes item from `body.item` and adding number of stacks into `body.with`
     *
     * @param {Object} pmcData      - PMC Part of profile
     * @param {Object} body         - Request Body
     * @param {string} sessionID    - Session ID
     * @returns response
     */
    static mergeItem(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        const items = InventoryController.getOwnerInventoryItems(
            body,
            sessionID
        );

        for (const key in items.to)
        {
            if (items.to[key]._id === body.with)
            {
                for (const key2 in items.from)
                {
                    if (
                        items.from[key2]._id &&
                        items.from[key2]._id === body.item
                    )
                    {
                        let stackItem0 = 1;
                        let stackItem1 = 1;

                        if (
                            !(
                                items.to[key].upd &&
                                items.to[key].upd.StackObjectsCount
                            )
                        )
                        {
                            items.to[key].upd = { StackObjectsCount: 1 };
                        }
                        else if (
                            !(
                                items.from[key2].upd &&
                                items.from[key2].upd.StackObjectsCount
                            )
                        )
                        {
                            items.from[key2].upd = { StackObjectsCount: 1 };
                        }

                        if (items.to[key].upd !== undefined)
                        {
                            stackItem0 = items.to[key].upd.StackObjectsCount;
                        }

                        if ("upd" in items.from[key2])
                        {
                            stackItem1 = items.from[key2].upd.StackObjectsCount;
                        }

                        if (stackItem0 === 1)
                        {
                            Object.assign(items.to[key], {
                                upd: { StackObjectsCount: 1 },
                            });
                        }

                        items.to[key].upd.StackObjectsCount =
                            stackItem0 + stackItem1;
                        output.profileChanges[sessionID].items.del.push({
                            _id: items.from[key2]._id,
                        });
                        items.from.splice(parseInt(key2), 1);
                        return output;
                    }
                }
            }
        }

        return {
            warnings: [],
            profileChanges: {},
        };
    }

    /**
     * Transfer item
     * Used to take items from scav inventory into stash or to insert ammo into mags (shotgun ones) and reloading weapon by clicking "Reload"
     *
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns
     */
    static transferItem(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        let itemFrom = null;
        let itemTo = null;

        for (const iterItem of pmcData.Inventory.items)
        {
            if (iterItem._id === body.item)
            {
                itemFrom = iterItem;
            }
            else if (iterItem._id === body.with)
            {
                itemTo = iterItem;
            }

            if (itemFrom !== null && itemTo !== null)
            {
                break;
            }
        }

        if (itemFrom !== null && itemTo !== null)
        {
            let stackFrom = 1;

            if ("upd" in itemFrom)
            {
                stackFrom = itemFrom.upd.StackObjectsCount;
            }
            else
            {
                Object.assign(itemFrom, { upd: { StackObjectsCount: 1 } });
            }

            if (stackFrom > body.count)
            {
                itemFrom.upd.StackObjectsCount = stackFrom - body.count;
            }
            else
            {
                // Moving a full stack onto a smaller stack
                itemFrom.upd.StackObjectsCount = stackFrom - 1;
            }

            let stackTo = 1;

            if ("upd" in itemTo)
            {
                stackTo = itemTo.upd.StackObjectsCount;
            }
            else
            {
                Object.assign(itemTo, { upd: { StackObjectsCount: 1 } });
            }

            itemTo.upd.StackObjectsCount = stackTo + body.count;
        }

        return output;
    }

    /**
     * Swap Item
     * its used for "reload" if you have weapon in hands and magazine is somewhere else in rig or backpack in equipment
     *
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns response object
     */
    static swapItem(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);

        for (const iterItem of pmcData.Inventory.items)
        {
            if (iterItem._id === body.item)
            {
                iterItem.parentId = body.to.id; // parentId
                iterItem.slotId = body.to.container; // slotId
                iterItem.location = body.to.location; // location
            }

            if (iterItem._id === body.item2)
            {
                iterItem.parentId = body.to2.id;
                iterItem.slotId = body.to2.container;
                delete iterItem.location;
            }
        }
        return output;
    }

    /**
     * Give Item
     * its used for "add" item like gifts etc.
     *
     * @param {Object} pmcData   - PMC Part of profile as JSON object
     * @param {Object} body      - request body
     * @param {Object} output    - response body
     * @param {string} sessionID     - Session ID
     * @param {function} callback    - callback function
     * @param {bool} [foundInRaid=false] - Found in Raid tag for given item
     * @param {*} addUpd     - @Incomplete: ???
     * @returns
     */
    static addItem(
        pmcData,
        body,
        output,
        sessionID,
        callback,
        foundInRaid = false,
        addUpd = null
    )
    {
        return InventoryHelper.addItem(
            pmcData,
            body,
            output,
            sessionID,
            callback,
            foundInRaid,
            addUpd
        );
    }

    /**
     * Handles folding of Weapons
     *
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns
     */
    static foldItem(pmcData, body, sessionID)
    {
        // Fix for folding weapons while on they're in the Scav inventory
        if (
            body.fromOwner &&
            body.fromOwner.type === "Profile" &&
            body.fromOwner.id !== pmcData._id
        )
        {
            pmcData = ProfileHelper.getScavProfile(sessionID);
        }

        for (const item of pmcData.Inventory.items)
        {
            if (item._id && item._id === body.item)
            {
                item.upd.Foldable = { Folded: body.value };
                return ItemEventRouter.getOutput(sessionID);
            }
        }

        return {
            warnings: [],
            profileChanges: {},
        };
    }

    /**
     * Toggles "Toggleable" items like night vision goggles and face shields.
     *
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns
     */
    static toggleItem(pmcData, body, sessionID)
    {
        // Fix for toggling items while on they're in the Scav inventory
        if (
            body.fromOwner &&
            body.fromOwner.type === "Profile" &&
            body.fromOwner.id !== pmcData._id
        )
        {
            pmcData = ProfileHelper.getScavProfile(sessionID);
        }

        for (const item of pmcData.Inventory.items)
        {
            if (item._id && item._id === body.item)
            {
                item.upd.Togglable = { On: body.value };
                return ItemEventRouter.getOutput(sessionID);
            }
        }

        //return "";
        return {
            warnings: [],
            profileChanges: {},
        };
    }

    /**
     * Handles Tagging of items (primary Containers).
     *
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns
     */
    static tagItem(pmcData, body, sessionID)
    {
        const cleanedTag = body.TagName.replace(/[^\w\d\s]/g, "");

        for (const item of pmcData.Inventory.items)
        {
            if (item._id === body.item)
            {
                if ("upd" in item)
                {
                    item.upd.Tag = { Color: body.TagColor, Name: cleanedTag };
                }
                else
                {
                    item.upd = {
                        Tag: { Color: body.TagColor, Name: cleanedTag },
                    };
                }

                return ItemEventRouter.getOutput(sessionID);
            }
        }

        //return "";
        return {
            warnings: [],
            profileChanges: {},
        };
    }

    /**
     * @Incomplete: ???
     *
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns
     */
    static bindItem(pmcData, body, sessionID)
    {
        for (const index in pmcData.Inventory.fastPanel)
        {
            if (pmcData.Inventory.fastPanel[index] === body.item)
            {
                pmcData.Inventory.fastPanel[index] = "";
            }
        }

        pmcData.Inventory.fastPanel[body.index] = body.item;
        return ItemEventRouter.getOutput(sessionID);
    }

    /**
     * Handles examining of the item
     *
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns
     */
    static examineItem(pmcData, body, sessionID)
    {
        let itemID = "";

        if ("fromOwner" in body)
        {
            // scan ragfair as a trader
            if (body.fromOwner.type === "RagFair")
            {
                body.fromOwner.type = "Trader";
            }

            // get trader assort
            if (body.fromOwner.type === "Trader")
            {
                try
                {
                    const traderItems =
                        DatabaseServer.tables.traders[body.fromOwner.id].assort
                            .items;
                    const examinedItem = traderItems.find(
                        item => item._id === body.item
                    );
                    itemID = examinedItem._tpl;
                }
                catch
                {
                    console.log(`No id with ${body.item} found.`);
                }
            }

            // get hideout item
            if (body.fromOwner.type === "HideoutProduction")
            {
                itemID = body.item;
            }
        }

        if (PresetHelper.isPreset(itemID))
        {
            // item preset
            itemID = PresetHelper.getBaseItemTpl(itemID);
        }

        if (!itemID)
        {
            // item template
            if (body.item in DatabaseServer.tables.templates.items)
            {
                itemID = body.item;
            }
        }

        if (!itemID)
        {
            // player inventory
            const target = pmcData.Inventory.items.find(item =>
            {
                return body.item === item._id;
            });

            if (target)
            {
                itemID = target._tpl;
            }
        }

        if (itemID)
        {
            // item found
            const item = DatabaseServer.tables.templates.items[itemID];

            pmcData.Info.Experience += item._props.ExamineExperience;
            pmcData.Encyclopedia[itemID] = true;
        }

        return ItemEventRouter.getOutput(sessionID);
    }

    static readEncyclopedia(pmcData, body, sessionID)
    {
        for (const id of body.ids)
        {
            pmcData.Encyclopedia[id] = true;
        }

        return ItemEventRouter.getOutput(sessionID);
    }

    /**
     * Handles sorting of Inventory.
     *
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns
     */
    static sortInventory(pmcData, body, sessionID)
    {
        let items = pmcData.Inventory.items;

        // handle changed items
        if (body.changedItems)
        {
            for (const target of body.changedItems)
            {
                // remove unsorted items
                let updatedItem = undefined;

                items = items.filter(item =>
                {
                    if (item._id === target._id)
                    {
                        updatedItem = JsonUtil.clone(item);
                    }
                    return item._id !== target._id;
                });

                if (typeof updatedItem._tpl !== "string")
                {
                    updatedItem = target;
                }
                else if (typeof target.location !== "undefined")
                {
                    updatedItem.location = target.location;
                    updatedItem.slotId = target.slotId;
                }

                // fix currency StackObjectsCount when single stack
                if (PaymentHelper.isMoneyTpl(updatedItem._tpl))
                {
                    updatedItem.upd = updatedItem.upd || {};
                    if (!updatedItem.upd.StackObjectsCount)
                    {
                        updatedItem.upd.StackObjectsCount = 1;
                    }
                }

                // add sorted items
                items.push(updatedItem);
            }
        }

        // handle deleted items
        if ("deletedItems" in body)
        {
            // This data is not found inside client 17566 - ApplyInventoryChangesCommand.cs
            throw new Error("looks like this data is used, uh oh");

            // for (const target of body.deletedItems)
            // {
            //     // remove items
            //     items = items.filter((item) =>
            //     {
            //         return item._id !== target._id;
            //     });
            // }
        }

        pmcData.Inventory.items = items;
        return ItemEventRouter.getOutput(sessionID);
    }

    static createMapMarker(pmcData, body, sessionID)
    {
        const item = pmcData.Inventory.items.find(i => i._id === body.item);

        // add marker
        item.upd.Map = item.upd.Map || { Markers: [] };
        item.upd.Map.Markers.push(body.mapMarker);

        // sync with client
        const output = ItemEventRouter.getOutput(sessionID);
        output.profileChanges[sessionID].items.change.push(item);
        return output;
    }

    static deleteMapMarker(pmcData, body, sessionID)
    {
        const item = pmcData.Inventory.items.find(i => i._id === body.item);

        // remove marker
        const markers = item.upd.Map.Markers.filter(marker =>
        {
            return marker.X !== body.X && marker.Y !== body.Y;
        });
        item.upd.Map.Markers = markers;

        // sync with client
        const output = ItemEventRouter.getOutput(sessionID);
        output.profileChanges[sessionID].items.change.push(item);
        return output;
    }

    static editMapMarker(pmcData, body, sessionID)
    {
        const item = pmcData.Inventory.items.find(i => i._id === body.item);

        // edit marker
        const index = item.upd.Map.Markers.findIndex(
            m => m.X === body.X && m.Y === body.Y
        );
        item.upd.Map.Markers[index] = body.mapMarker;

        // sync with client
        const output = ItemEventRouter.getOutput(sessionID);
        output.profileChanges[sessionID].items.change.push(item);
        return output;
    }
}

module.exports = InventoryController;

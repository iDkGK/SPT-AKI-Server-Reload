"use strict";

require("../Lib.js");

class InventoryController
{
    /**
     * Move Item
     * change location of item with parentId and slotId
     * transfers items from one profile to another if fromOwner/toOwner is set in the body.
     * otherwise, move is contained within the same profile_f.
     */
    static moveItem(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        const items = InventoryHelper.getOwnerInventoryItems(body, sessionID);

        if (items.sameInventory)
        {
            InventoryHelper.moveItemInternal(items.from, body);
        }
        else
        {
            InventoryHelper.moveItemToProfile(items.from, items.to, body);
        }
        return output;
    }

    /**
     * Remove Item from Profile
     * Deep tree item deletion, also removes items from insurance list
     */
    static removeItem(pmcData, itemId, sessionID, output = undefined)
    {
        return InventoryHelper.removeItem(pmcData, itemId, sessionID, output);
    }

    /**
     * Implements functionality "Discard" from Main menu (Stash etc.)
     * Removes item from PMC Profile
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
     */
    static splitItem(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        let location = body.container.location;

        const items = InventoryHelper.getOwnerInventoryItems(body, sessionID);

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
     */
    static mergeItem(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);
        const items = InventoryHelper.getOwnerInventoryItems(body, sessionID);

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

        return {
            warnings: [],
            profileChanges: {},
        };
    }

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
     * Handles examining an item
     * @param pmcData player profile
     * @param body request object
     * @param sessionID session id
     * @returns response
     */
    static examineItem(pmcData, body, sessionID)
    {
        let itemId = "";
        if ("fromOwner" in body)
        {
            try
            {
                itemId = InventoryController.getExaminedItemTpl(body);
            }
            catch
            {
                Logger.error(`examineItem() - No id with ${body.item} found.`);
            }

            // get hideout item
            if (body.fromOwner.type === "HideoutProduction")
            {
                itemId = body.item;
            }
        }

        if (!itemId)
        {
            // item template
            if (body.item in DatabaseServer.getTables().templates.items)
            {
                itemId = body.item;
            }
        }

        if (!itemId)
        {
            // player inventory
            const target = pmcData.Inventory.items.find(item =>
            {
                return body.item === item._id;
            });

            if (target)
            {
                itemId = target._tpl;
            }
        }

        if (itemId)
        {
            // item found
            const item = DatabaseServer.getTables().templates.items[itemId];

            pmcData.Info.Experience += item._props.ExamineExperience;
            pmcData.Encyclopedia[itemId] = true;
        }

        return ItemEventRouter.getOutput(sessionID);
    }

    /**
     * Get the tplid of an item from the examine request object
     * @param body response request
     * @returns tplid
     */
    static getExaminedItemTpl(body)
    {
        if (PresetHelper.isPreset(body.item))
        {
            return PresetHelper.getBaseItemTpl(body.item);
        }
        else if (body.fromOwner.id === Traders.FENCE)
        {
            // get tpl from fence assorts
            return FenceService.getFenceAssorts().items.find(
                x => x._id === body.item
            )._tpl;
        }
        else if (body.fromOwner.type === "Trader")
        {
            // not fence
            // get tpl from trader assort
            return DatabaseServer.getTables().traders[
                body.fromOwner.id
            ].assort.items.find(item => item._id === body.item)._tpl;
        }
        else if (body.fromOwner.type === "RagFair")
        {
            // try to get tplid from items.json first
            const item = DatabaseServer.getTables().templates.items[body.item];
            if (item)
            {
                return item._id;
            }

            // try alternate way of getting offer if first approach fails
            let offer = RagfairOfferService.getOfferByOfferId(body.item);
            if (!offer)
            {
                offer = RagfairOfferService.getOfferByOfferId(
                    body.fromOwner.id
                );
            }

            // try find examine item inside offer items array
            const matchingItem = offer.items.find(x => x._id === body.item);
            if (matchingItem)
            {
                return matchingItem._tpl;
            }

            // unable to find item in database or ragfair
            throw new Error(`Unable to find item: ${body.item}`);
        }
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

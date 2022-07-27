"use strict";

require("../Lib.js");

class InventoryHelper
{
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
        const itemLib = [];
        const itemsToAdd = [];
        for (const baseItem of body.items)
        {
            if (baseItem.item_id in DatabaseServer.tables.globals.ItemPresets)
            {
                const presetItems = JsonUtil.clone(
                    DatabaseServer.tables.globals.ItemPresets[baseItem.item_id]
                        ._items
                );
                itemLib.push(...presetItems);
                baseItem.isPreset = true;
                baseItem.item_id = presetItems[0]._id;
            }
            else if (PaymentHelper.isMoneyTpl(baseItem.item_id))
            {
                itemLib.push({ _id: baseItem.item_id, _tpl: baseItem.item_id });
            }
            else if (body.tid === TraderHelper.TRADER.Fence)
            {
                const fenceItem = FenceService.getFenceAssorts().items;
                const item =
                    fenceItem[
                        fenceItem.findIndex(i => i._id === baseItem.item_id)
                    ];
                // handle when item being bought is preset
                if (item.upd.sptPresetId)
                {
                    const presetItems = JsonUtil.clone(
                        DatabaseServer.tables.globals.ItemPresets[
                            item.upd.sptPresetId
                        ]._items
                    );
                    itemLib.push(...presetItems);
                    baseItem.isPreset = true;
                    baseItem.item_id = presetItems[0]._id;
                }
                else
                {
                    itemLib.push({ _id: baseItem.item_id, _tpl: item._tpl });
                }
            }
            else
            {
                // Only grab the relevant trader items and add unique values
                const traderItems = TraderController.getAssort(
                    sessionID,
                    body.tid
                ).items;
                const relevantItems = ItemHelper.findAndReturnChildrenAsItems(
                    traderItems,
                    baseItem.item_id
                );
                const toAdd = relevantItems.filter(
                    traderItem =>
                        !itemLib.some(item => traderItem._id === item._id)
                );
                itemLib.push(...toAdd);
            }

            for (const item of itemLib)
            {
                if (item._id === baseItem.item_id)
                {
                    const tmpItem = ItemHelper.getItem(item._tpl)[1];
                    const itemToAdd = {
                        itemRef: item,
                        count: baseItem.count,
                        isPreset: baseItem.isPreset,
                    };
                    let MaxStacks = 1;
                    // split stacks if the size is higher than allowed by StackMaxSize
                    if (baseItem.count > tmpItem._props.StackMaxSize)
                    {
                        let count = baseItem.count;
                        const calc =
                            baseItem.count -
                            Math.floor(
                                baseItem.count / tmpItem._props.StackMaxSize
                            ) *
                                tmpItem._props.StackMaxSize;
                        MaxStacks =
                            calc > 0
                                ? MaxStacks +
                                  Math.floor(
                                      count / tmpItem._props.StackMaxSize
                                  )
                                : Math.floor(
                                    count / tmpItem._props.StackMaxSize
                                );
                        for (let sv = 0; sv < MaxStacks; sv++)
                        {
                            if (count > 0)
                            {
                                const newItemToAdd = JsonUtil.clone(itemToAdd);
                                if (count > tmpItem._props.StackMaxSize)
                                {
                                    count = count - tmpItem._props.StackMaxSize;
                                    newItemToAdd.count =
                                        tmpItem._props.StackMaxSize;
                                }
                                else
                                {
                                    newItemToAdd.count = count;
                                }
                                itemsToAdd.push(newItemToAdd);
                            }
                        }
                    }
                    else
                    {
                        itemsToAdd.push(itemToAdd);
                    }
                    // stacks prepared
                }
            }
        }
        // Find an empty slot in stash for each of the items being added
        let StashFS_2D = PlayerService.getStashSlotMap(pmcData, sessionID);
        for (const itemToAdd of itemsToAdd)
        {
            const itemSize = InventoryHelper.getItemSize(
                itemToAdd.itemRef._tpl,
                itemToAdd.itemRef._id,
                itemLib
            );
            const findSlotResult = ContainerHelper.findSlotForItem(
                StashFS_2D,
                itemSize[0],
                itemSize[1]
            );
            if (findSlotResult.success)
            {
                /* Fill in the StashFS_2D with an imaginary item, to simulate it already being added
                 * so the next item to search for a free slot won't find the same one */
                const itemSizeX = findSlotResult.rotation
                    ? itemSize[1]
                    : itemSize[0];
                const itemSizeY = findSlotResult.rotation
                    ? itemSize[0]
                    : itemSize[1];
                try
                {
                    StashFS_2D = ContainerHelper.fillContainerMapWithItem(
                        StashFS_2D,
                        findSlotResult.x,
                        findSlotResult.y,
                        itemSizeX,
                        itemSizeY,
                        false
                    ); // TODO: rotation not passed in, bad?
                }
                catch (err)
                {
                    Logger.error(
                        `fillContainerMapWithItem returned with an error${
                            typeof err === "string" ? ` -> ${err}` : ""
                        }`
                    );
                    return HttpResponse.appendErrorToOutput(
                        output,
                        "Not enough stash space"
                    );
                }
                itemToAdd.location = {
                    x: findSlotResult.x,
                    y: findSlotResult.y,
                    rotation: findSlotResult.rotation,
                };
            }
            else
            {
                return HttpResponse.appendErrorToOutput(
                    output,
                    "Not enough stash space"
                );
            }
        }

        // We've succesfully found a slot for each item, let's execute the callback and see if it fails (ex. payMoney might fail)
        try
        {
            if (typeof callback === "function")
            {
                callback();
            }
        }
        catch (err)
        {
            const message =
                typeof err === "string" ? err : "An unknown error occurred";
            return HttpResponse.appendErrorToOutput(output, message);
        }

        for (const itemToAdd of itemsToAdd)
        {
            let newItem = HashUtil.generate();
            const toDo = [[itemToAdd.itemRef._id, newItem]];
            let upd = { StackObjectsCount: itemToAdd.count };
            //if it is from ItemPreset, load preset's upd data too.
            if (itemToAdd.isPreset)
            {
                for (const updID in itemToAdd.itemRef.upd)
                {
                    upd[updID] = itemToAdd.itemRef.upd[updID];
                }
            }

            // add ragfair upd properties
            if (addUpd)
            {
                upd = { ...addUpd, ...upd };
            }

            // hideout items need to be marked as found in raid
            // or in case people want all items to be marked as found in raid
            if (foundInRaid || InventoryConfig.newItemsMarkedFound)
            {
                upd.SpawnedInSession = true;
            }

            if (upd.UnlimitedCount)
            {
                delete upd.UnlimitedCount;
            }
            output.profileChanges[sessionID].items.new.push({
                _id: newItem,
                _tpl: itemToAdd.itemRef._tpl,
                parentId: pmcData.Inventory.stash,
                slotId: "hideout",
                location: {
                    x: itemToAdd.location.x,
                    y: itemToAdd.location.y,
                    r: itemToAdd.location.rotation ? 1 : 0,
                },
                upd: upd,
            });
            pmcData.Inventory.items.push({
                _id: newItem,
                _tpl: itemToAdd.itemRef._tpl,
                parentId: pmcData.Inventory.stash,
                slotId: "hideout",
                location: {
                    x: itemToAdd.location.x,
                    y: itemToAdd.location.y,
                    r: itemToAdd.location.rotation ? 1 : 0,
                },
                upd: upd,
            });
            // If this is an ammobox, add cartridges to it.
            // Damaged ammo box are not loaded.
            const itemInfo = ItemHelper.getItem(itemToAdd.itemRef._tpl)[1];
            const ammoBoxInfo = itemInfo._props.StackSlots;
            if (
                ammoBoxInfo !== undefined &&
                itemInfo._name.indexOf("_damaged") < 0
            )
            {
                // Cartridge info seems to be an array of size 1 for some reason... (See AmmoBox constructor in client code)
                let maxCount = ammoBoxInfo[0]._max_count;
                const ammoTmplId = ammoBoxInfo[0]._props.filters[0].Filter[0];
                const ammoStackMaxSize =
                    ItemHelper.getItem(ammoTmplId)[1]._props.StackMaxSize;
                const ammos = [];
                let location = 0;
                while (maxCount > 0)
                {
                    const ammoStackSize =
                        maxCount <= ammoStackMaxSize
                            ? maxCount
                            : ammoStackMaxSize;
                    ammos.push({
                        _id: HashUtil.generate(),
                        _tpl: ammoTmplId,
                        parentId: toDo[0][1],
                        slotId: "cartridges",
                        location: location,
                        upd: { StackObjectsCount: ammoStackSize },
                    });
                    location++;
                    maxCount -= ammoStackMaxSize;
                }

                for (const item of [
                    output.profileChanges[sessionID].items.new,
                    pmcData.Inventory.items,
                ])
                {
                    item.push(...ammos);
                }
            }

            while (toDo.length > 0)
            {
                for (const tmpKey in itemLib)
                {
                    if (
                        itemLib[tmpKey].parentId &&
                        itemLib[tmpKey].parentId === toDo[0][0]
                    )
                    {
                        newItem = HashUtil.generate();
                        const SlotID = itemLib[tmpKey].slotId;
                        // if it is from ItemPreset, load preset's upd data too.if (itemToAdd.isPreset)
                        {
                            upd = { StackObjectsCount: itemToAdd.count };
                            for (const updID in itemLib[tmpKey].upd)
                            {
                                upd[updID] = itemLib[tmpKey].upd[updID];
                            }

                            if (
                                foundInRaid ||
                                InventoryConfig.newItemsMarkedFound
                            )
                            {
                                upd.SpawnedInSession = true;
                            }
                        }

                        if (SlotID === "hideout")
                        {
                            output.profileChanges[sessionID].items.new.push({
                                _id: newItem,
                                _tpl: itemLib[tmpKey]._tpl,
                                parentId: toDo[0][1],
                                slotId: SlotID,
                                location: {
                                    x: itemToAdd.location.x,
                                    y: itemToAdd.location.y,
                                    r: "Horizontal",
                                },
                                upd: upd,
                            });
                            pmcData.Inventory.items.push({
                                _id: newItem,
                                _tpl: itemLib[tmpKey]._tpl,
                                parentId: toDo[0][1],
                                slotId: itemLib[tmpKey].slotId,
                                location: {
                                    x: itemToAdd.location.x,
                                    y: itemToAdd.location.y,
                                    r: "Horizontal",
                                },
                                upd: upd,
                            });
                        }
                        else
                        {
                            const itemLocation = {};
                            if (itemLib[tmpKey]["location"] !== undefined)
                            {
                                itemLocation["location"] =
                                    itemLib[tmpKey]["location"];
                            }
                            output.profileChanges[sessionID].items.new.push({
                                _id: newItem,
                                _tpl: itemLib[tmpKey]._tpl,
                                parentId: toDo[0][1],
                                slotId: SlotID,
                                ...itemLocation,
                                upd: upd,
                            });
                            pmcData.Inventory.items.push({
                                _id: newItem,
                                _tpl: itemLib[tmpKey]._tpl,
                                parentId: toDo[0][1],
                                slotId: itemLib[tmpKey].slotId,
                                ...itemLocation,
                                upd: upd,
                            });
                        }
                        toDo.push([itemLib[tmpKey]._id, newItem]);
                    }
                }
                toDo.splice(0, 1);
            }
        }
        return output;
    }

    static removeItem(pmcData, itemId, sessionID, output = undefined)
    {
        if (!itemId)
        {
            return output;
        }
        const childIds = InventoryHelper.findAndReturnChildren(pmcData, itemId);
        const inventoryItems = pmcData.Inventory.items;
        const insuredItems = pmcData.InsuredItems;
        if (output)
        {
            // client only needs to know the root item is deleted
            output.profileChanges[sessionID].items.del.push({ _id: itemId });
        }

        for (const childId of childIds)
        {
            // We expect that each inventory item and each insured item has unique "_id", respective "itemId".
            // Therefore we want to use a NON-Greedy function and escape the iteration as soon as we find requested item.
            const inventoryIndex = inventoryItems.findIndex(
                item => item._id === childId
            );
            if (inventoryIndex > -1)
            {
                inventoryItems.splice(inventoryIndex, 1);
            }
            const insuredIndex = insuredItems.findIndex(
                item => item.itemId === childId
            );
            if (insuredIndex > -1)
            {
                insuredItems.splice(insuredIndex, 1);
            }
        }
        return output;
    }

    static getSecureContainerItems(items)
    {
        const secureContainer = items.find(
            x => x.slotId === "SecuredContainer"
        );

        // No container found, drop out
        if (!secureContainer)
        {
            return [];
        }

        const itemsInSecureContainer = ItemHelper.findAndReturnChildrenByItems(
            items,
            secureContainer._id
        );

        // Return all items returned and exclude the secure container item itself
        return itemsInSecureContainer.filter(x => x !== secureContainer._id);
    }

    static removeSecureContainer(profile)
    {
        const items = profile.Inventory.items;

        // Remove secured container
        for (const item of items)
        {
            if (item.slotId === "SecuredContainer")
            {
                const toRemove = ItemHelper.findAndReturnChildrenByItems(
                    items,
                    item._id
                );
                let n = items.length;

                while (n-- > 0)
                {
                    if (toRemove.includes(items[n]._id))
                    {
                        items.splice(n, 1);
                    }
                }
                break;
            }
        }

        profile.Inventory.items = items;
        return profile;
    }

    static getStashType(sessionID)
    {
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const stashObj = pmcData.Inventory.items.find(
            item => item._id === pmcData.Inventory.stash
        );
        if (!stashObj)
        {
            Logger.error("No stash found");
            return "";
        }
        return stashObj._tpl;
    }

    static generateInventoryID(profile)
    {
        const defaultInventory = "55d7217a4bdc2d86028b456d";
        const itemsByParentHash = {};
        const inventoryItemHash = {};
        let inventoryId = "";

        // Generate inventoryItem list
        for (const item of profile.Inventory.items)
        {
            inventoryItemHash[item._id] = item;

            if (item._tpl === defaultInventory)
            {
                inventoryId = item._id;
                continue;
            }

            if (!("parentId" in item))
            {
                continue;
            }

            if (!(item.parentId in itemsByParentHash))
            {
                itemsByParentHash[item.parentId] = [];
            }

            itemsByParentHash[item.parentId].push(item);
        }

        // update inventoryId
        const newInventoryId = HashUtil.generate();
        inventoryItemHash[inventoryId]._id = newInventoryId;
        profile.Inventory.equipment = newInventoryId;

        // update inventoryItem id
        if (inventoryId in itemsByParentHash)
        {
            for (const item of itemsByParentHash[inventoryId])
            {
                item.parentId = newInventoryId;
            }
        }

        return profile;
    }

    /* Calculate Size of item inputed
     * inputs Item template ID, Item Id, InventoryItem (item from inventory having _id and _tpl)
     * outputs [width, height]
     */
    static getItemSize(itemTpl, itemID, InventoryItem)
    {
        // -> Prepares item Width and height returns [sizeX, sizeY]
        return InventoryHelper.getSizeByInventoryItemHash(
            itemTpl,
            itemID,
            InventoryHelper.getInventoryItemHash(InventoryItem)
        );
    }

    // note from 2027: there IS a thing i didn't explore and that is Merges With Children
    // -> Prepares item Width and height returns [sizeX, sizeY]
    static getSizeByInventoryItemHash(itemTpl, itemID, inventoryItemHash)
    {
        const toDo = [itemID];
        const tmpItem = ItemHelper.getItem(itemTpl)[1];
        const rootItem = inventoryItemHash.byItemId[itemID];
        const FoldableWeapon = tmpItem._props.Foldable || false;
        const FoldedSlot = tmpItem._props.FoldedSlot;

        let SizeUp = 0;
        let SizeDown = 0;
        let SizeLeft = 0;
        let SizeRight = 0;

        let ForcedUp = 0;
        let ForcedDown = 0;
        let ForcedLeft = 0;
        let ForcedRight = 0;
        let outX = tmpItem._props.Width;
        const outY = tmpItem._props.Height;
        const skipThisItems = [
            ItemHelper.BASECLASS.Backpack,
            ItemHelper.BASECLASS.SearchableItem,
            ItemHelper.BASECLASS.SimpleContainer,
        ];
        const rootFolded =
            rootItem.upd &&
            rootItem.upd.Foldable &&
            rootItem.upd.Foldable.Folded === true;

        //The item itself is collapsible
        if (
            FoldableWeapon &&
            (FoldedSlot === undefined || FoldedSlot === "") &&
            rootFolded
        )
        {
            outX -= tmpItem._props.SizeReduceRight;
        }

        if (!skipThisItems.includes(tmpItem._parent))
        {
            while (toDo.length > 0)
            {
                if (toDo[0] in inventoryItemHash.byParentId)
                {
                    for (const item of inventoryItemHash.byParentId[toDo[0]])
                    {
                        //Filtering child items outside of mod slots, such as those inside containers, without counting their ExtraSize attribute
                        if (item.slotId.indexOf("mod_") < 0)
                        {
                            continue;
                        }

                        toDo.push(item._id);

                        // If the barrel is folded the space in the barrel is not counted
                        const itm = ItemHelper.getItem(item._tpl)[1];
                        const childFoldable = itm._props.Foldable;
                        const childFolded =
                            item.upd &&
                            item.upd.Foldable &&
                            item.upd.Foldable.Folded === true;

                        if (
                            FoldableWeapon &&
                            FoldedSlot === item.slotId &&
                            (rootFolded || childFolded)
                        )
                        {
                            continue;
                        }
                        else if (childFoldable && rootFolded && childFolded)
                        {
                            continue;
                        }

                        // Calculating child ExtraSize
                        if (itm._props.ExtraSizeForceAdd === true)
                        {
                            ForcedUp += itm._props.ExtraSizeUp;
                            ForcedDown += itm._props.ExtraSizeDown;
                            ForcedLeft += itm._props.ExtraSizeLeft;
                            ForcedRight += itm._props.ExtraSizeRight;
                        }
                        else
                        {
                            SizeUp =
                                SizeUp < itm._props.ExtraSizeUp
                                    ? itm._props.ExtraSizeUp
                                    : SizeUp;
                            SizeDown =
                                SizeDown < itm._props.ExtraSizeDown
                                    ? itm._props.ExtraSizeDown
                                    : SizeDown;
                            SizeLeft =
                                SizeLeft < itm._props.ExtraSizeLeft
                                    ? itm._props.ExtraSizeLeft
                                    : SizeLeft;
                            SizeRight =
                                SizeRight < itm._props.ExtraSizeRight
                                    ? itm._props.ExtraSizeRight
                                    : SizeRight;
                        }
                    }
                }

                toDo.splice(0, 1);
            }
        }

        return [
            outX + SizeLeft + SizeRight + ForcedLeft + ForcedRight,
            outY + SizeUp + SizeDown + ForcedUp + ForcedDown,
        ];
    }

    /* Find And Return Children (TRegular)
     * input: PlayerData, InitialItem._id
     * output: list of item._id
     * List is backward first item is the furthest child and last item is main item
     * returns all child items ids in array, includes itself and children
     * */
    static findAndReturnChildren(pmcData, itemID)
    {
        return ItemHelper.findAndReturnChildrenByItems(
            pmcData.Inventory.items,
            itemID
        );
    }

    /* Get Player Stash Proper Size
     * input: null
     * output: [stashSizeWidth, stashSizeHeight]
     * */
    static getPlayerStashSize(sessionID)
    {
        //this sets automaticly a stash size from items.json (its not added anywhere yet cause we still use base stash)
        const stashX =
            DatabaseServer.tables.templates.items[stashTPL]._props.Grids[0]
                ._props.cellsH !== 0
                ? DatabaseServer.tables.templates.items[stashTPL]._props
                    .Grids[0]._props.cellsH
                : 10;
        const stashY =
            DatabaseServer.tables.templates.items[stashTPL]._props.Grids[0]
                ._props.cellsV !== 0
                ? DatabaseServer.tables.templates.items[stashTPL]._props
                    .Grids[0]._props.cellsV
                : 66;
        return [stashX, stashY];
    }

    static getInventoryItemHash(InventoryItem)
    {
        const inventoryItemHash = {
            byItemId: {},
            byParentId: {},
        };

        for (let i = 0; i < InventoryItem.length; i++)
        {
            const item = InventoryItem[i];
            inventoryItemHash.byItemId[item._id] = item;

            if (!("parentId" in item))
            {
                continue;
            }

            if (!(item.parentId in inventoryItemHash.byParentId))
            {
                inventoryItemHash.byParentId[item.parentId] = [];
            }
            inventoryItemHash.byParentId[item.parentId].push(item);
        }
        return inventoryItemHash;
    }

    /**
     * Recursively checks if the given item is
     * inside the stash, that is it has the stash as
     * ancestor with slotId=hideout
     */
    static isItemInStash(pmcData, item)
    {
        let container = item;

        while ("parentId" in container)
        {
            if (
                container.parentId === pmcData.Inventory.stash &&
                container.slotId === "hideout"
            )
            {
                return true;
            }

            container = pmcData.Inventory.items.find(
                i => i._id === container.parentId
            );
            if (!container)
            {
                break;
            }
        }
        return false;
    }

    static getContainerMap(containerW, containerH, itemList, containerId)
    {
        const container2D = Array(containerH)
            .fill(0)
            .map(() => Array(containerW).fill(0));
        const inventoryItemHash =
            InventoryHelper.getInventoryItemHash(itemList);
        const containerItemHash = inventoryItemHash.byParentId[containerId];

        if (!containerItemHash)
        {
            // No items in the container
            return container2D;
        }

        for (const item of containerItemHash)
        {
            if (!("location" in item))
            {
                continue;
            }

            const tmpSize = InventoryHelper.getSizeByInventoryItemHash(
                item._tpl,
                item._id,
                inventoryItemHash
            );
            const iW = tmpSize[0]; // x
            const iH = tmpSize[1]; // y
            const fH =
                item.location.r === 1 ||
                item.location.r === "Vertical" ||
                item.location.rotation === "Vertical"
                    ? iW
                    : iH;
            const fW =
                item.location.r === 1 ||
                item.location.r === "Vertical" ||
                item.location.rotation === "Vertical"
                    ? iH
                    : iW;
            const fillTo = item.location.x + fW;

            for (let y = 0; y < fH; y++)
            {
                try
                {
                    container2D[item.location.y + y].fill(
                        1,
                        item.location.x,
                        fillTo
                    );
                }
                catch (e)
                {
                    Logger.error(
                        `[OOB] for item with id ${item._id}; Error message: ${e}`
                    );
                }
            }
        }

        return container2D;
    }
}

module.exports = InventoryHelper;

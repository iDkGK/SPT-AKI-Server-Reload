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
            if (
                baseItem.item_id in
                DatabaseServer.getTables().globals.ItemPresets
            )
            {
                const presetItems = JsonUtil.clone(
                    DatabaseServer.getTables().globals.ItemPresets[
                        baseItem.item_id
                    ]._items
                );
                itemLib.push(...presetItems);
                baseItem.isPreset = true;
                baseItem.item_id = presetItems[0]._id;
            }
            else if (PaymentHelper.isMoneyTpl(baseItem.item_id))
            {
                itemLib.push({ _id: baseItem.item_id, _tpl: baseItem.item_id });
            }
            else if (body.tid === Traders.FENCE)
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
                        DatabaseServer.getTables().globals.ItemPresets[
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
                const traderItems = TraderAssortHelper.getAssort(
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
                    let maxStacks = 1;

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

                        maxStacks =
                            calc > 0
                                ? maxStacks +
                                  Math.floor(
                                      count / tmpItem._props.StackMaxSize
                                  )
                                : Math.floor(
                                    count / tmpItem._props.StackMaxSize
                                );

                        for (let sv = 0; sv < maxStacks; sv++)
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
        let stashFS2D = InventoryHelper.getStashSlotMap(pmcData, sessionID);

        for (const itemToAdd of itemsToAdd)
        {
            const itemSize = InventoryHelper.getItemSize(
                itemToAdd.itemRef._tpl,
                itemToAdd.itemRef._id,
                itemLib
            );
            const findSlotResult = ContainerHelper.findSlotForItem(
                stashFS2D,
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
                    stashFS2D = ContainerHelper.fillContainerMapWithItem(
                        stashFS2D,
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
                    return HttpResponseUtil.appendErrorToOutput(
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
                return HttpResponseUtil.appendErrorToOutput(
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
            return HttpResponseUtil.appendErrorToOutput(output, message);
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

                        const slotID = itemLib[tmpKey].slotId;

                        // if it is from ItemPreset, load preset's upd data too.
                        if (itemToAdd.isPreset)
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

                        if (slotID === "hideout")
                        {
                            output.profileChanges[sessionID].items.new.push({
                                _id: newItem,
                                _tpl: itemLib[tmpKey]._tpl,
                                parentId: toDo[0][1],
                                slotId: slotID,
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
                                slotId: slotID,
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
        if (!itemId) return output;

        const childIds = ItemHelper.findAndReturnChildrenByItems(
            pmcData.Inventory.items,
            itemId
        );
        const inventoryItems = pmcData.Inventory.items;
        const insuredItems = pmcData.InsuredItems;

        if (output)
            output.profileChanges[sessionID].items.del.push({ _id: itemId });

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

    static removeItemByCount(
        pmcData,
        itemId,
        count,
        sessionID,
        output = undefined
    )
    {
        if (!itemId) return output;

        const itemsToReduce = ItemHelper.findAndReturnChildrenAsItems(
            pmcData.Inventory.items,
            itemId
        );
        let remainingCount = count;
        for (const itemToReduce of itemsToReduce)
        {
            let itemAmount;
            if (!itemToReduce.upd.StackObjectsCount) itemAmount = 1;
            else itemAmount = itemToReduce.upd.StackObjectsCount;

            if (remainingCount >= itemAmount)
            {
                remainingCount -= itemAmount;
                InventoryHelper.removeItem(
                    pmcData,
                    itemToReduce._id,
                    sessionID,
                    output
                );
            }
            else
            {
                itemToReduce.upd.StackObjectsCount -= remainingCount;
                remainingCount = 0;
                if (output)
                    output.profileChanges[sessionID].items.change.push(
                        itemToReduce
                    );
            }

            if (remainingCount === 0) break;
        }

        return output;
    }

    /* Calculate Size of item inputed
     * inputs Item template ID, Item Id, InventoryItem (item from inventory having _id and _tpl)
     * outputs [width, height]
     */
    static getItemSize(itemTpl, itemID, inventoryItem)
    {
        // -> Prepares item Width and height returns [sizeX, sizeY]
        return InventoryHelper.getSizeByInventoryItemHash(
            itemTpl,
            itemID,
            InventoryHelper.getInventoryItemHash(inventoryItem)
        );
    }

    // note from 2027: there IS a thing i didn't explore and that is Merges With Children
    // -> Prepares item Width and height returns [sizeX, sizeY]
    static getSizeByInventoryItemHash(itemTpl, itemID, inventoryItemHash)
    {
        const toDo = [itemID];
        const tmpItem = ItemHelper.getItem(itemTpl)[1];
        const rootItem = inventoryItemHash.byItemId[itemID];
        const foldableWeapon = tmpItem._props.Foldable || false;
        const foldedSlot = tmpItem._props.FoldedSlot;

        let sizeUp = 0;
        let sizeDown = 0;
        let sizeLeft = 0;
        let sizeRight = 0;

        let forcedUp = 0;
        let forcedDown = 0;
        let forcedLeft = 0;
        let forcedRight = 0;
        let outX = tmpItem._props.Width;
        const outY = tmpItem._props.Height;
        const skipThisItems = [
            BaseClasses.BACKPACK,
            BaseClasses.SEARCHABLE_ITEM,
            BaseClasses.SIMPLE_CONTAINER,
        ];
        const rootFolded =
            rootItem.upd &&
            rootItem.upd.Foldable &&
            rootItem.upd.Foldable.Folded === true;

        //The item itself is collapsible
        if (
            foldableWeapon &&
            (foldedSlot === undefined || foldedSlot === "") &&
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
                            foldableWeapon &&
                            foldedSlot === item.slotId &&
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
                            forcedUp += itm._props.ExtraSizeUp;
                            forcedDown += itm._props.ExtraSizeDown;
                            forcedLeft += itm._props.ExtraSizeLeft;
                            forcedRight += itm._props.ExtraSizeRight;
                        }
                        else
                        {
                            sizeUp =
                                sizeUp < itm._props.ExtraSizeUp
                                    ? itm._props.ExtraSizeUp
                                    : sizeUp;
                            sizeDown =
                                sizeDown < itm._props.ExtraSizeDown
                                    ? itm._props.ExtraSizeDown
                                    : sizeDown;
                            sizeLeft =
                                sizeLeft < itm._props.ExtraSizeLeft
                                    ? itm._props.ExtraSizeLeft
                                    : sizeLeft;
                            sizeRight =
                                sizeRight < itm._props.ExtraSizeRight
                                    ? itm._props.ExtraSizeRight
                                    : sizeRight;
                        }
                    }
                }

                toDo.splice(0, 1);
            }
        }

        return [
            outX + sizeLeft + sizeRight + forcedLeft + forcedRight,
            outY + sizeUp + sizeDown + forcedUp + forcedDown,
        ];
    }

    static getInventoryItemHash(inventoryItem)
    {
        const inventoryItemHash = {
            byItemId: {},
            byParentId: {},
        };

        for (let i = 0; i < inventoryItem.length; i++)
        {
            const item = inventoryItem[i];
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

    /**
     * Based on the item action, determine whose inventories we should be looking at for from and to.
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
     * Made a 2d array table with 0 - free slot and 1 - used slot
     * @param {Object} pmcData
     * @param {string} sessionID
     * @returns Array
     */
    static getStashSlotMap(pmcData, sessionID)
    {
        const playerStashSize = InventoryHelper.getPlayerStashSize(sessionID);
        return InventoryHelper.getContainerMap(
            playerStashSize[0],
            playerStashSize[1],
            pmcData.Inventory.items,
            pmcData.Inventory.stash
        );
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

    /* Get Player Stash Proper Size
     * input: null
     * output: [stashSizeWidth, stashSizeHeight]
     * */
    static getPlayerStashSize(sessionID)
    {
        //this sets automaticly a stash size from items.json (its not added anywhere yet cause we still use base stash)
        const stashTPL = InventoryHelper.getStashType(sessionID);
        const stashX =
            DatabaseServer.getTables().templates.items[stashTPL]._props.Grids[0]
                ._props.cellsH !== 0
                ? DatabaseServer.getTables().templates.items[stashTPL]._props
                    .Grids[0]._props.cellsH
                : 10;
        const stashY =
            DatabaseServer.getTables().templates.items[stashTPL]._props.Grids[0]
                ._props.cellsV !== 0
                ? DatabaseServer.getTables().templates.items[stashTPL]._props
                    .Grids[0]._props.cellsV
                : 66;
        return [stashX, stashY];
    }

    /**
     * Internal helper function to transfer an item from one profile to another.
     * fromProfileData: Profile of the source.
     * toProfileData: Profile of the destination.
     * body: Move request
     */
    static moveItemToProfile(fromItems, toItems, body)
    {
        InventoryHelper.handleCartridges(fromItems, body);

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
     */
    static moveItemInternal(inventoryItems, body)
    {
        InventoryHelper.handleCartridges(inventoryItems, body);

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
}

module.exports = InventoryHelper;

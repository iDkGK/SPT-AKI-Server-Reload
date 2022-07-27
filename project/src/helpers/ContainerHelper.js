"use strict";

require("../Lib.js");

class FindSlotResult
{
    constructor(success = false, x = null, y = null, rotation = false)
    {
        this.success = success;
        this.x = x;
        this.y = y;
        this.rotation = rotation;
    }
}

class ContainerHelper
{
    static locateSlot(container2D, containerX, containerY, x, y, itemW, itemH)
    {
        let foundSlot = true;

        for (let itemY = 0; itemY < itemH; itemY++)
        {
            if (foundSlot && y + itemH - 1 > containerY - 1)
            {
                foundSlot = false;
                break;
            }

            for (let itemX = 0; itemX < itemW; itemX++)
            {
                if (foundSlot && x + itemW - 1 > containerX - 1)
                {
                    foundSlot = false;
                    break;
                }

                if (container2D[y + itemY][x + itemX] !== 0)
                {
                    foundSlot = false;
                    break;
                }
            }

            if (!foundSlot)
            {
                break;
            }
        }

        return foundSlot;
    }

    /* Finds a slot for an item in a given 2D container map
     * Output: { success: boolean, x: number, y: number, rotation: boolean }
     */
    static findSlotForItem(container2D, itemWidth, itemHeight)
    {
        let rotation = false;
        const minVolume = (itemWidth < itemHeight ? itemWidth : itemHeight) - 1;
        const containerY = container2D.length;
        const containerX = container2D[0].length;
        const limitY = containerY - minVolume;
        const limitX = containerX - minVolume;

        for (let y = 0; y < limitY; y++)
        {
            for (let x = 0; x < limitX; x++)
            {
                let foundSlot = ContainerHelper.locateSlot(
                    container2D,
                    containerX,
                    containerY,
                    x,
                    y,
                    itemWidth,
                    itemHeight
                );

                /**
                 * Try to rotate if there is enough room for the item
                 * Only occupies one grid of items, no rotation required
                 * */
                if (!foundSlot && itemWidth * itemHeight > 1)
                {
                    foundSlot = ContainerHelper.locateSlot(
                        container2D,
                        containerX,
                        containerY,
                        x,
                        y,
                        itemHeight,
                        itemWidth
                    );

                    if (foundSlot)
                    {
                        rotation = true;
                    }
                }

                if (!foundSlot)
                {
                    continue;
                }

                return new FindSlotResult(true, x, y, rotation);
            }
        }

        return new FindSlotResult();
    }

    static fillContainerMapWithItem(container2D, x, y, itemW, itemH, rotate)
    {
        const itemWidth = rotate ? itemH : itemW;
        const itemHeight = rotate ? itemW : itemH;

        for (let tmpY = y; tmpY < y + itemHeight; tmpY++)
        {
            for (let tmpX = x; tmpX < x + itemWidth; tmpX++)
            {
                if (container2D[tmpY][tmpX] === 0)
                {
                    container2D[tmpY][tmpX] = 1;
                }
                else
                {
                    throw `Slot at (${x}, ${y}) is already filled`;
                }
            }
        }

        return container2D;
    }
}

module.exports = ContainerHelper;

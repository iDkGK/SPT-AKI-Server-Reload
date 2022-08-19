"use strict";

require("../Lib.js");

class RagfairLinkedItemService
{
    static linkedItemsCache = {};

    static getLinkedItems(linkedSearchId)
    {
        if (Object.keys(RagfairLinkedItemService.linkedItemsCache).length === 0)
        {
            RagfairLinkedItemService.buildLinkedItemTable();
        }

        return RagfairLinkedItemService.linkedItemsCache[linkedSearchId];
    }

    static buildLinkedItemTable()
    {
        const linkedItems = {};
        const getLinkedItems = (id) =>
        {
            if (!(id in linkedItems))
            {
                linkedItems[id] = new Set();
            }
            return linkedItems[id];
        };

        for (const item of Object.values(DatabaseServer.getTables().templates.items))
        {
            const itemLinkedSet = getLinkedItems(item._id);

            const applyLinkedItems = (items) =>
            {
                for (const linkedItemId of items)
                {
                    itemLinkedSet.add(linkedItemId);
                    getLinkedItems(linkedItemId).add(item._id);
                }
            };

            applyLinkedItems(RagfairLinkedItemService.getFilters(item, "Slots"));
            applyLinkedItems(RagfairLinkedItemService.getFilters(item, "Chambers"));
            applyLinkedItems(RagfairLinkedItemService.getFilters(item, "Cartridges"));
        }

        RagfairLinkedItemService.linkedItemsCache = linkedItems;
    }

    /* Scans a given slot type for filters and returns them as a Set */
    static getFilters(item, slot)
    {
        if (!(slot in item._props && item._props[slot].length))
        {
            // item slot doesnt exist
            return [];
        }

        const filters = [];
        for (const sub of item._props[slot])
        {
            if (!("_props" in sub && "filters" in sub._props))
            {
                // not a filter
                continue;
            }

            for (const filter of sub._props.filters)
            {
                for (const f of filter.Filter)
                {
                    filters.push(f);
                }
            }
        }

        return filters;
    }
}

module.exports = RagfairLinkedItemService;
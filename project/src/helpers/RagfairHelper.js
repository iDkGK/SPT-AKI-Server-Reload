"use strict";

require("../Lib.js");

class RagfairHelper
{
    /**
     * Gets currency TAG from TPL
     * @param {string} currency
     * @returns string
     */
    static getCurrencyTag(currency)
    {
        switch (currency)
        {
            case "569668774bdc2da2298b4568":
                return "EUR";

            case "5696686a4bdc2da3298b456a":
                return "USD";

            case "5449016a4bdc2d6f028b456f":
                return "RUB";

            default:
                return "";
        }
    }

    static filterCategories(sessionID, info)
    {
        let result = [];

        // Case: weapon builds
        if (info.buildCount)
        {
            return Object.keys(info.buildItems);
        }

        // Case: search
        if (info.linkedSearchId)
        {
            result = Array.from(
                RagfairLinkedItemService.getLinkedItems(info.linkedSearchId)
            );
        }

        // Case: category
        if (info.handbookId)
        {
            const handbook = RagfairHelper.getCategoryList(info.handbookId);

            if (result.length)
            {
                result = UtilityHelper.arrayIntersect(result, handbook);
            }
            else
            {
                result = handbook;
            }
        }

        return result;
    }

    static getDisplayableAssorts(sessionID)
    {
        const result = {};

        for (const traderID in DatabaseServer.getTables().traders)
        {
            if (RagfairConfig.traders[traderID])
            {
                result[traderID] = TraderAssortHelper.getAssort(
                    sessionID,
                    traderID
                );
            }
        }

        return result;
    }

    static getCategoryList(handbookId)
    {
        let result = [];

        // if its "mods" great-parent category, do double recursive loop
        if (handbookId === "5b5f71a686f77447ed5636ab")
        {
            for (const categ of HandbookHelper.childrenCategories(handbookId))
            {
                for (const subcateg of HandbookHelper.childrenCategories(
                    categ
                ))
                {
                    result = [
                        ...result,
                        ...HandbookHelper.templatesWithParent(subcateg),
                    ];
                }
            }

            return result;
        }

        // item is in any other category
        if (HandbookHelper.isCategory(handbookId))
        {
            // list all item of the category
            result = HandbookHelper.templatesWithParent(handbookId);

            for (const categ of HandbookHelper.childrenCategories(handbookId))
            {
                result = [
                    ...result,
                    ...HandbookHelper.templatesWithParent(categ),
                ];
            }

            return result;
        }

        // its a specific item searched
        result.push(handbookId);
        return result;
    }

    /* Because of presets, categories are not always 1 */
    static countCategories(result)
    {
        const categories = {};

        for (const offer of result.offers)
        {
            // only the first item can have presets
            const item = offer.items[0];
            categories[item._tpl] = categories[item._tpl] || 0;
            categories[item._tpl]++;
        }

        // not in search mode, add back non-weapon items
        for (const category in result.categories)
        {
            if (!categories[category])
            {
                categories[category] = 1;
            }
        }

        result.categories = categories;
    }

    /**
     * Merges Root Items
     * Ragfair allows abnormally large stacks.
     */
    static mergeStackable(items)
    {
        const list = [];
        let rootItem;

        for (let item of items)
        {
            item = ItemHelper.fixItemStackCount(item);
            const isChild = items.find(it => it._id === item.parentId);

            if (!isChild)
            {
                if (!rootItem)
                {
                    rootItem = JsonUtil.clone(item);
                    rootItem.upd.OriginalStackObjectsCount =
                        rootItem.upd.StackObjectsCount;
                }
                else
                {
                    rootItem.upd.StackObjectsCount +=
                        item.upd.StackObjectsCount;
                    list.push(item);
                }
            }
            else
            {
                list.push(item);
            }
        }

        return [...[rootItem], ...list];
    }

    static getCurrencySymbol(currencyTpl)
    {
        switch (currencyTpl)
        {
            case Money.EUROS:
                return "€";

            case Money.DOLLARS:
                return "$";

            case Money.ROUBLES:
            default:
                return "₽";
        }
    }
}

module.exports = RagfairHelper;

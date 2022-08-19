"use strict";

require("../Lib.js");

class LookupItem
{
    byId;
    byParent;

    constructor()
    {
        this.byId = {};
        this.byParent = {};
    }
}

class LookupCollection
{
    items;
    categories;

    constructor()
    {
        this.items = new LookupItem();
        this.categories = new LookupItem();
    }
}

class HandbookHelper
{
    static lookup = new LookupCollection();

    static hydrateLookup(lookup)
    {
        HandbookHelper.lookup = lookup;
    }

    static getTemplatePrice(x)
    {
        return x in HandbookHelper.lookup.items.byId
            ? HandbookHelper.lookup.items.byId[x]
            : 1;
    }

    /* all items in template with the given parent category */
    static templatesWithParent(x)
    {
        return x in HandbookHelper.lookup.items.byParent
            ? HandbookHelper.lookup.items.byParent[x]
            : [];
    }

    static isCategory(x)
    {
        return x in HandbookHelper.lookup.categories.byId;
    }

    static childrenCategories(x)
    {
        return x in HandbookHelper.lookup.categories.byParent
            ? HandbookHelper.lookup.categories.byParent[x]
            : [];
    }

    /**
     * Gets Currency to Ruble conversion Value
     * @param {number} value
     * @param {string} currencyFrom
     * @returns number
     */
    static inRUB(value, currencyFrom)
    {
        return Math.round(
            value * (HandbookHelper.getTemplatePrice(currencyFrom) || 0)
        );
    }

    /**
     * Gets Ruble to Currency conversion Value
     * @param {number} value
     * @param {string} currencyTo
     * @returns number
     */
    static fromRUB(value, currencyTo)
    {
        const price = HandbookHelper.getTemplatePrice(currencyTo);
        return price ? Math.round(value / price) : 0;
    }
}

module.exports = HandbookHelper;

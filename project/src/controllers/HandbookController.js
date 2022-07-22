"use strict";

require("../Lib.js");

class LookupItem
{
    constructor()
    {
        this.byId = {};
        this.byParent = {};
    }
}

class LookupCollection
{
    constructor()
    {
        this.items = new LookupItem();
        this.categories = new LookupItem();
    }
}

class HandbookController
{
    static lookup = new LookupCollection();

    static load()
    {
        const lookup = new LookupCollection();

        for (const x of DatabaseServer.tables.templates.handbook.Items)
        {
            lookup.items.byId[x.Id] = x.Price;
            lookup.items.byParent[x.ParentId] || (lookup.items.byParent[x.ParentId] = []);
            lookup.items.byParent[x.ParentId].push(x.Id);
        }

        for (const x of DatabaseServer.tables.templates.handbook.Categories)
        {
            lookup.categories.byId[x.Id] = x.ParentId ? x.ParentId : null;

            if (x.ParentId)
            {
                // root as no parent
                lookup.categories.byParent[x.ParentId] || (lookup.categories.byParent[x.ParentId] = []);
                lookup.categories.byParent[x.ParentId].push(x.Id);
            }
        }

        HandbookController.lookup = lookup;
    }

    static getTemplatePrice(x)
    {
        return (x in HandbookController.lookup.items.byId) ? HandbookController.lookup.items.byId[x] : 1;
    }

    /* all items in template with the given parent category */
    static templatesWithParent(x)
    {
        return (x in HandbookController.lookup.items.byParent) ? HandbookController.lookup.items.byParent[x] : [];
    }

    static isCategory(x)
    {
        return (x in HandbookController.lookup.categories.byId);
    }

    static childrenCategories(x)
    {
        return (x in HandbookController.lookup.categories.byParent) ? HandbookController.lookup.categories.byParent[x] : [];
    }
}

module.exports = HandbookController;
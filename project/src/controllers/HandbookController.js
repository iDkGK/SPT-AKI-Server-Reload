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
    static load()
    {
        const lookup = new LookupCollection();

        for (const handbookItem of DatabaseServer.tables.templates.handbook
            .Items)
        {
            lookup.items.byId[handbookItem.Id] = handbookItem.Price;
            lookup.items.byParent[handbookItem.ParentId] ||
                (lookup.items.byParent[handbookItem.ParentId] = []);
            lookup.items.byParent[handbookItem.ParentId].push(handbookItem.Id);
        }

        for (const handbookCategory of DatabaseServer.tables.templates.handbook
            .Categories)
        {
            lookup.categories.byId[handbookCategory.Id] =
                handbookCategory.ParentId ? handbookCategory.ParentId : null;

            if (handbookCategory.ParentId)
            {
                // root as no parent
                lookup.categories.byParent[handbookCategory.ParentId] ||
                    (lookup.categories.byParent[handbookCategory.ParentId] =
                        []);
                lookup.categories.byParent[handbookCategory.ParentId].push(
                    handbookCategory.Id
                );
            }
        }

        HandbookHelper.hydrateLookup(lookup);
    }
}

module.exports = HandbookController;

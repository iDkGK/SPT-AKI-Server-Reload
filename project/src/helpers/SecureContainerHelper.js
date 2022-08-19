"use strict";

require("../Lib.js");

class SecureContainerHelper
{
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
}

module.exports = SecureContainerHelper;

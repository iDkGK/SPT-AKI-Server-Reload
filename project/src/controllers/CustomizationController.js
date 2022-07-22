"use strict";

require("../Lib.js");

class CustomizationController
{
    static wearClothing(pmcData, body, sessionID)
    {
        for (let i = 0; i < body.suites.length; i++)
        {
            const suite = DatabaseServer.tables.templates.customization[body.suites[i]];

            // this parent reffers to Lower Node
            if (suite._parent === "5cd944d01388ce000a659df9")
            {
                pmcData.Customization.Feet = suite._props.Feet;
            }

            // this parent reffers to Upper Node
            if (suite._parent === "5cd944ca1388ce03a44dc2a4")
            {
                pmcData.Customization.Body = suite._props.Body;
                pmcData.Customization.Hands = suite._props.Hands;
            }
        }

        return ItemEventRouter.getOutput(sessionID);
    }

    static getTraderSuits(traderID, sessionID)
    {
        const pmcData = ProfileController.getPmcProfile(sessionID);
        const templates = DatabaseServer.tables.templates.customization;
        const suits = DatabaseServer.tables.traders[traderID].suits;
        const result = [];

        // get only suites from the player's side (e.g. USEC)
        for (const suit of suits)
        {
            if (suit.suiteId in templates)
            {
                for (let i = 0; i < templates[suit.suiteId]._props.Side.length; i++)
                {
                    if (templates[suit.suiteId]._props.Side[i] === pmcData.Info.Side)
                    {
                        result.push(suit);
                    }
                }
            }
        }

        return result;
    }

    static getAllTraderSuits(sessionID)
    {
        const traders = DatabaseServer.tables.traders;
        let result = [];

        for (const traderID in traders)
        {
            if (traders[traderID].base.customization_seller === true)
            {
                result = [...result, ...CustomizationController.getTraderSuits(traderID, sessionID)];
            }
        }

        return result;
    }

    static buyClothing(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);

        // find suit offer
        const offers = CustomizationController.getAllTraderSuits(sessionID);
        const offer = offers.find((suit) =>
        {
            return body.offer === suit._id;
        });

        if (!offer)
        {
            Logger.error("OOPS");
            return output;
        }

        // check if outfit already exists
        if (SaveServer.profiles[sessionID].suits.find((suit) =>
        {
            return suit === body.offer;
        }))
        {
            return output;
        }

        // pay items
        for (const sellItem of body.items)
        {
            for (const itemID in pmcData.Inventory.items)
            {
                const item = pmcData.Inventory.items[itemID];

                if (item._id !== sellItem.id)
                {
                    continue;
                }

                if (sellItem.del === true)
                {
                    output.profileChanges[sessionID].items.del.push(item);
                    pmcData.Inventory.items.splice(itemID, 1);
                }

                if (item.upd.StackObjectsCount > sellItem.count)
                {
                    pmcData.Inventory.items[itemID].upd.StackObjectsCount -= sellItem.count;
                    output.profileChanges[sessionID].items.change.push({
                        "_id": item._id,
                        "_tpl": item._tpl,
                        "parentId": item.parentId,
                        "slotId": item.slotId,
                        "location": item.location,
                        "upd": { "StackObjectsCount": item.upd.StackObjectsCount }
                    });
                }
            }
        }

        // add suit
        SaveServer.profiles[sessionID].suits.push(offer.suiteId);
        return output;
    }
}

module.exports = CustomizationController;

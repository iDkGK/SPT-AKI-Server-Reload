"use strict";

require("../Lib.js");

class RagfairAssortGenerator
{
    static generatedAssortItems = [];

    static getAssortItems()
    {
        if (!RagfairAssortGenerator.assortsAreGenerated())
        {
            RagfairAssortGenerator.generatedAssortItems = RagfairAssortGenerator.generateRagfairAssortItems();
        }

        return RagfairAssortGenerator.generatedAssortItems;
    }

    static assortsAreGenerated()
    {
        return RagfairAssortGenerator.generatedAssortItems.length > 0;
    }

    static generateRagfairAssortItems()
    {
        const results = [];
        const items = JsonUtil.clone(DatabaseServer.tables.templates.items);
        const weaponPresets = JsonUtil.clone(DatabaseServer.tables.globals.ItemPresets);

        for (const item of Object.values(items))
        {
            if (!ItemHelper.isValidItem(item._id))
            {
                continue;
            }

            results.push(RagfairAssortGenerator.createRagfairAssortItem(item._id, item._id)); // tplid and id must be the same so hideout recipie reworks work
        }

        for (const weapon of Object.values(weaponPresets))
        {
            results.push(RagfairAssortGenerator.createRagfairAssortItem(weapon._items[0]._tpl, weapon._id)); // preset id must be passed thruogh to ensure flea shows presets
        }

        return results;
    }

    static createRagfairAssortItem(tplId, id = HashUtil.generate())
    {
        return {
            "_id": id,
            "_tpl": tplId,
            "parentId": "hideout",
            "slotId": "hideout",
            "upd": {
                "StackObjectsCount": 99999999,
                "UnlimitedCount": true
            }
        };
    }
}

module.exports = RagfairAssortGenerator;
"use strict";

require("../Lib.js");

class LocationController
{
    /* get a location with generated loot data */
    static get(location)
    {
        const name = location.toLowerCase().replace(" ", "");
        return LocationController.generate(name);
    }

    /* generates a random location preset to use for local session */
    static generate(name)
    {
        const location = DatabaseServer.tables.locations[name];
        const output = location.base;

        output.UnixDateTime = TimeUtil.getTimestamp();

        // don't generate loot on hideout
        if (name === "hideout")
        {
            return output;
        }

        const locationName = location.base.Name;

        // generate loot
        const staticWeapons = JsonUtil.clone(
            DatabaseServer.tables.loot.staticContainers[locationName]
                .staticWeapons
        );
        const staticContainers = JsonUtil.clone(
            DatabaseServer.tables.loot.staticContainers[locationName]
                .staticContainers
        );
        const staticForced = JsonUtil.clone(
            DatabaseServer.tables.loot.staticContainers[locationName]
                .staticForced
        );
        const staticLootDist = JsonUtil.clone(
            DatabaseServer.tables.loot.staticLoot
        );
        const staticAmmoDist = JsonUtil.clone(
            DatabaseServer.tables.loot.staticAmmo
        );

        output.Loot = [];

        // mounted weapons
        for (const mi of staticWeapons)
        {
            output.Loot.push(mi);
        }

        let count = 0;
        // static loot
        for (const ci of staticContainers)
        {
            const container = LocationGenerator.generateContainerLoot(
                ci,
                staticForced,
                staticLootDist,
                staticAmmoDist,
                name
            );
            output.Loot.push(container);
            count++;
        }
        Logger.success(`A total of ${count} containers generated`);

        // dyanmic loot
        const dynamicLootDist = JsonUtil.clone(location.looseLoot);
        const dynamicLoot = LocationGenerator.generateDynamicLoot(
            dynamicLootDist,
            staticAmmoDist,
            name
        );
        for (const dli of dynamicLoot)
        {
            output.Loot.push(dli);
        }

        // done generating
        Logger.success(
            `A total of ${dynamicLoot.length} dynamic items spawned`
        );
        Logger.success(`Generated location ${name}`);

        return output;
    }

    /* get all locations without loot data */
    static generateAll()
    {
        const locations = DatabaseServer.tables.locations;
        const returnResult = {
            locations: undefined,
            paths: [],
        };

        // use right id's and strip loot
        const data = {};
        for (const name in locations)
        {
            if (name === "base")
            {
                continue;
            }

            const map = locations[name].base;

            map.Loot = [];
            data[map._Id] = map;
        }

        returnResult.locations = data;
        returnResult.paths = locations.base.paths;
        return returnResult;
    }
}

module.exports = LocationController;

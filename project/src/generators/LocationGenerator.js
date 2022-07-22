"use strict";

const { itemIsChristmasRelated } = require("../helpers/GameEventHelper.js");

require("../Lib.js");

class LocationGenerator
{
    static generateContainerLoot(containerIn, staticForced, staticLootDist, staticAmmoDist, locationName)
    {
        const container = JsonUtil.clone(containerIn);
        const containerTypeId = container.Items[0]._tpl;
        const parentId = ObjectId.generate();
        container.Root = parentId;
        container.Items[0]._id = parentId;

        const containerTemplate = ItemHelper.getItem(containerTypeId)[1];
        const height = containerTemplate._props.Grids[0]._props.cellsV;
        const width = containerTemplate._props.Grids[0]._props.cellsH;
        let container2D = Array(height).fill(0).map(() => Array(width).fill(0));

        const itemCountArray = new RandomUtil.ProbabilityObjectArray();
        for (const icd of staticLootDist[containerTypeId].itemcountDistribution)
        {
            itemCountArray.push(
                new RandomUtil.ProbabilityObject(icd.count, icd.relativeProbability)
            );
        }
        const numberItems = Math.round(LocationGenerator.getStaticLootMultiplerForLocation(locationName) * itemCountArray.draw()[0]);

        const itemDistribution = new RandomUtil.ProbabilityObjectArray();
        for (const icd of staticLootDist[containerTypeId].itemDistribution)
        {
            itemDistribution.push(
                new RandomUtil.ProbabilityObject(icd.tpl, icd.relativeProbability)
            );
        }

        // Forced container loot
        const tplsForced = staticForced.filter(x => x.containerId === container.Id).map(x => x.itemTpl);

        // Draw random loot
        // money spawn more than once in container
        const locklist = [ItemHelper.MONEY.Roubles, ItemHelper.MONEY.Dollars, ItemHelper.MONEY.Euros];
        const tplsDraw = itemDistribution.draw(numberItems, false, locklist);
        const tpls = tplsForced.concat(tplsDraw);
        for (const tpl of tpls)
        {
            if (!GameEventHelper.christmasEventEnabled() && GameEventHelper.itemIsChristmasRelated(tpl))
            {
                // Skip christmas event items if they're not enabled
                continue;
            }

            const created = LocationGenerator.createItem(tpl, staticAmmoDist, parentId);
            const items = created.items;
            const width = created.width;
            const height = created.height;

            const result = ContainerHelper.findSlotForItem(container2D, width, height);
            if (!result.success)
            {
                break;
            }

            container2D = ContainerHelper.fillContainerMapWithItem(container2D, result.x, result.y, width, height, result.rotation);
            const rot = result.rotation ? 1 : 0;

            items[0].slotId = "main";
            items[0].location = { "x": result.x, "y": result.y, "r": rot };


            for (const item of items)
            {
                container.Items.push(item);
            }
        }
        return container;
    }

    static getLooseLootMultiplerForLocation(location)
    {
        return LocationConfig.looseLootMultiplier[location];
    }

    static getStaticLootMultiplerForLocation(location)
    {
        return LocationConfig.staticLootMultiplier[location];
    }

    static generateDynamicLoot(dynamicLootDist, staticAmmoDist, locationName)
    {
        const loot = [];
        const forced = JsonUtil.clone(dynamicLootDist.spawnpointsForced);

        for (const fi of forced)
        {
            const li = fi.template;
            li.Root = ObjectId.generate();
            li.Items[0]._id = li.Root;
            loot.push(li);
        }

        const dynamicDist = JsonUtil.clone(dynamicLootDist.spawnpoints);
        //draw from random distribution
        const numSpawnpoints = Math.round(
            LocationGenerator.getLooseLootMultiplerForLocation(locationName) *
            RandomUtil.randn(
                dynamicLootDist.spawnpointCount.mean,
                dynamicLootDist.spawnpointCount.std
            )
        );

        const spawnpointArray = new RandomUtil.ProbabilityObjectArray();
        for (const si of dynamicDist)
        {
            spawnpointArray.push(
                new RandomUtil.ProbabilityObject(si.template.Id, si.probability, si)
            );
        }

        let spawnpoints = [];
        for (const si of spawnpointArray.draw(numSpawnpoints, false))
        {
            spawnpoints.push(spawnpointArray.data(si));
        }

        // filter out duplicate locationIds
        spawnpoints = [...new Map(spawnpoints.map(x => [x.locationId, x])).values()];
        const numDupes = numSpawnpoints - spawnpoints.length;
        if (numDupes > 0)
        {
            Logger.info(`${numDupes} spawnpoints with duplicate location were removed.`);
        }

        for (const spi of spawnpoints)
        {
            const itemArray = new RandomUtil.ProbabilityObjectArray();
            for (const itemDist of spi.itemDistribution)
            {
                itemArray.push(
                    new RandomUtil.ProbabilityObject(itemDist.tpl, itemDist.relativeProbability)
                );
            }

            const tpl = itemArray.draw(1)[0];
            const created = LocationGenerator.createItem(tpl, staticAmmoDist);
            const items = created.items;

            const spawnpointTemplate = spi.template;
            spawnpointTemplate.Root = items[0]._id;

            for (const item of items)
            {
                spawnpointTemplate.Items.push(item);
            }

            loot.push(spawnpointTemplate);
        }

        return loot;
    }

    static createItem(tpl, staticAmmoDist, parentId = undefined)
    {
        const itemTemplate = ItemHelper.getItem(tpl)[1];

        let items = [
            {
                "_id": ObjectId.generate(),
                "_tpl": tpl,
            }
        ];

        // container item has container's id as parentId
        if (parentId)
        {
            items[0].parentId = parentId;
        }

        let width = itemTemplate._props.Width;
        let height = itemTemplate._props.Height;
        if (ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.Weapon))
        {
            let children;
            const presets = JsonUtil.clone(PresetController.getPresets(tpl));
            const defaultPreset = presets.find(x => x._encyclopedia);
            if (defaultPreset)
            {
                try
                {
                    children = RagfairServer.getPresetItems(defaultPreset);
                }
                catch (error)
                {
                    // this item already broke it once without being reproducible tpl = "5839a40f24597726f856b511";
                    Logger.warning(`PresetItems could not be found for ${tpl}`);
                    Logger.warning(`defaultPreset: ${defaultPreset}`);
                    Logger.warning(`parentId: ${parentId}`);
                    throw error;
                }
            }

            const rootItem = items[0];
            items = RagfairServer.reparentPresets(rootItem, children);

            // Here we should use generalized BotGenerators functions e.g. fillExistingMagazines in the future since
            // it can handle revolver ammo (it's not restructured to be used here yet.)
            // General: Make a WeaponController for Ragfair preset stuff and the generating weapons and ammo stuff from
            // BotGenerator
            const mag = items.filter(x => x.slotId === "mod_magazine")[0];
            // some weapon presets come without magazine; only fill the mag if it exists
            if (mag)
            {
                const weapTemplate = ItemHelper.getItem(rootItem._tpl)[1];
                // we can't use weaponTemplate's "_props.ammoCaliber" directly since there's a weapon ("weapon_zmz_pp-9_9x18pmm")
                // with non-existing ammoCaliber: Caliber9x18PMM -> We get the Caliber from the weapons' default ammo
                const defAmmoTemplate = ItemHelper.getItem(weapTemplate._props.defAmmo)[1];
                const magTemplate = ItemHelper.getItem(mag._tpl)[1];
                items.push(
                    LocationGenerator.createRandomMagCartridges(
                        magTemplate,
                        mag._id,
                        staticAmmoDist,
                        defAmmoTemplate._props.Caliber
                    )
                );
            }

            const size = ItemHelper.getItemSize(items, rootItem._id);
            width = size.width;
            height = size.height;
        }

        if (ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.Money) || ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.Ammo))
        {
            const stackCount = RandomUtil.getInt(itemTemplate._props.StackMinRandom, itemTemplate._props.StackMaxRandom);
            items[0].upd = { "StackObjectsCount": stackCount };
        }
        else if (ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.AmmoBox))
        {
            const tpl = itemTemplate._props.StackSlots[0]._props.filters[0].Filter[0];
            items.push(LocationGenerator.createCartidges(items[0]._id, tpl, itemTemplate._props.StackMaxRandom));
        }
        else if (ItemHelper.isOfBaseclass(tpl, ItemHelper.BASECLASS.Magazine))
        {
            items.push(LocationGenerator.createRandomMagCartridges(itemTemplate, items[0]._id, staticAmmoDist));
        }

        return {
            "items": items,
            "width": width,
            "height": height
        };

    }

    static getRandomCompatibleCaliberTemplateId(item)
    {
        return item._props.Cartridges[0]._props.filters[0].Filter[Math.floor(Math.random() * item._props.Cartridges[0]._props.filters[0].Filter.length)];
    }

    static getCaliber(magTemplate)
    {
        const ammoTpls = magTemplate._props.Cartridges[0]._props.filters[0].Filter;
        const calibers = [
            ...new Set(
                ammoTpls.filter(
                    x => ItemHelper.getItem(x)[0]
                ).map(
                    x => ItemHelper.getItem(x)[1]._props.Caliber
                )
            )
        ];
        return RandomUtil.DrawRandomFromList(calibers);
    }

    static drawAmmoTpl(caliber, staticAmmoDist)
    {
        const ammoArray = new RandomUtil.ProbabilityObjectArray();
        for (const icd of staticAmmoDist[caliber])
        {
            ammoArray.push(
                new RandomUtil.ProbabilityObject(icd.tpl, icd.relativeProbability)
            );
        }
        return ammoArray.draw(1)[0];
    }

    static createRandomMagCartridges(magTemplate, parentId, staticAmmoDist, caliber = undefined)
    {
        if (!caliber)
        {
            caliber = LocationGenerator.getCaliber(magTemplate);
        }
        const ammoTpl = LocationGenerator.drawAmmoTpl(caliber, staticAmmoDist);
        const maxCount = magTemplate._props.Cartridges[0]._max_count;
        const stackCount = RandomUtil.getInt(Math.round(0.25 * maxCount), maxCount);
        return LocationGenerator.createCartidges(parentId, ammoTpl, stackCount);
    }

    static createCartidges(parentId, ammoTpl, stackCount)
    {
        return {
            "_id": ObjectId.generate(),
            "_tpl": ammoTpl,
            "parentId": parentId,
            "slotId": "cartridges",
            "upd": { "StackObjectsCount": stackCount }
        };
    }
}



module.exports = LocationGenerator;
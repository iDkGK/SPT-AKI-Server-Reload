"use strict";

require("../Lib.js");

class InRaidHelper
{
    /**
     * Reset the SPT inraid property stored in a profile to 'none'
     * @param sessionID Session id
     */
    static removePlayer(sessionID)
    {
        SaveServer.getProfile(sessionID).inraid.location = "none";
    }

    /**
     * Some maps have one-time-use keys (e.g. Labs
     * Remove the relevant key from an inventory based on the post-raid request data passed in
     * @param offraidData post-raid data
     * @param sessionID Session id
     */
    static removeMapAccessKey(offraidData, sessionID)
    {
        const locationName =
            SaveServer.getProfile(sessionID).inraid.location.toLowerCase();
        const mapKey =
            DatabaseServer.getTables().locations[locationName].base
                .AccessKeys[0];

        if (!mapKey)
        {
            return;
        }

        for (const item of offraidData.profile.Inventory.items)
        {
            if (item._tpl === mapKey && item.slotId !== "Hideout")
            {
                InventoryHelper.removeItem(
                    offraidData.profile,
                    item._id,
                    sessionID
                );
                break;
            }
        }
    }

    /**
     * Check an array of items and add an upd object to money items with a stack count of 1
     * Single stack money items have no upd object and thus no StackObjectsCount, causing issues
     * @param items Items array to check
     */
    static addUpdToMoneyFromRaid(items)
    {
        for (const item of items)
        {
            if (PaymentHelper.isMoneyTpl(item._tpl))
            {
                if (!item.upd)
                {
                    item.upd = {};
                }

                if (!item.upd.StackObjectsCount)
                {
                    item.upd.StackObjectsCount = 1;
                }
            }
        }
    }

    /**
     * Add karma changes up and return the new value
     * @param existingFenceStanding Current fence standing level
     * @param victims Array of kills player performed
     * @returns adjusted karma level after kills are taken into account
     */
    static calculateFenceStandingChangeFromKills(
        existingFenceStanding,
        victims
    )
    {
        for (const victim of victims)
        {
            let standingForKill;
            if (victim.Side === "Savage")
            {
                standingForKill =
                    DatabaseServer.getTables().bots.types[
                        victim.Role.toLowerCase()
                    ].experience.standingForKill;
            }
            else
            {
                standingForKill =
                    DatabaseServer.getTables().bots.types[
                        victim.Side.toLowerCase()
                    ].experience.standingForKill;
            }

            if (standingForKill)
            {
                existingFenceStanding += standingForKill;
            }
            else
            {
                Logger.warning(
                    `standing for kill not found for ${victim.Side}:${victim.Role}`
                );
            }
        }

        return existingFenceStanding;
    }

    /**
     * Reset a profile to a baseline, used post-raid
     * Reset points earned during session property
     * Increment exp
     * Remove Labs keycard
     * @param profileData Profile to update
     * @param saveProgressRequest post raid save data request data
     * @param sessionID Sessino id
     * @returns Reset profile object
     */
    static updateProfileBaseStats(profileData, saveProgressRequest, sessionID)
    {
        // remove old skill fatigue
        for (const skill of saveProgressRequest.profile.Skills.Common)
        {
            skill.PointsEarnedDuringSession = 0.0;
        }

        // set profile data
        profileData.Info.Level = saveProgressRequest.profile.Info.Level;
        profileData.Skills = saveProgressRequest.profile.Skills;
        profileData.Stats = saveProgressRequest.profile.Stats;
        profileData.Encyclopedia = saveProgressRequest.profile.Encyclopedia;
        profileData.ConditionCounters =
            saveProgressRequest.profile.ConditionCounters;
        profileData.Quests = saveProgressRequest.profile.Quests;

        profileData.SurvivorClass = saveProgressRequest.profile.SurvivorClass;

        // add experience points
        profileData.Info.Experience += profileData.Stats.TotalSessionExperience;
        profileData.Stats.TotalSessionExperience = 0;

        // Remove the Lab card
        InRaidHelper.removeMapAccessKey(saveProgressRequest, sessionID);
        InRaidHelper.removePlayer(sessionID);

        if (!saveProgressRequest.isPlayerScav)
        {
            ProfileFixerService.checkForAndFixPmcProfileIssues(profileData);
        }

        return profileData;
    }

    /**
     * Adds SpawnedInSession property to items found in a raid
     * Removes SpawnedInSession for non-scav players if item was taken into raid with SpawnedInSession = true
     * @param preRaidProfile profile to update
     * @param postRaidProfile profile to upate inventory contents of
     * @param isPlayerScav Was this a p scav raid
     * @returns
     */
    static addSpawnedInSessionPropertyToItems(
        preRaidProfile,
        postRaidProfile,
        isPlayerScav
    )
    {
        for (const item of postRaidProfile.Inventory.items)
        {
            if (!isPlayerScav)
            {
                const itemExistsInProfile = preRaidProfile.Inventory.items.find(
                    itemData => item._id === itemData._id
                );
                if (itemExistsInProfile)
                {
                    if ("upd" in item && "SpawnedInSession" in item.upd)
                    {
                        // if the item exists and is taken inside the raid, remove the taken in raid status
                        delete item.upd.SpawnedInSession;
                    }

                    continue;
                }
            }

            if ("upd" in item)
            {
                item.upd.SpawnedInSession = true;
            }
            else
            {
                item.upd = { SpawnedInSession: true };
            }
        }

        return postRaidProfile;
    }

    /**
     * Iterate over inventory items and remove the property that defines an item as Found in Raid
     * Only removes property if item had FiR when entering raid
     * @param postRaidProfile profile to update items for
     * @returns Updated profile with SpawnedInSession removed
     */
    static removeSpawnedInSessionPropertyFromItems(postRaidProfile)
    {
        const items = DatabaseServer.getTables().templates.items;
        for (const offraidItem of postRaidProfile.Inventory.items)
        {
            // Remove the FIR status if the item marked FIR at raid start
            if (
                "upd" in offraidItem &&
                "SpawnedInSession" in offraidItem.upd &&
                !items[offraidItem._tpl]._props.QuestItem
            )
            {
                delete offraidItem.upd.SpawnedInSession;
            }

            continue;
        }

        return postRaidProfile;
    }

    /**
     * Update a players inventory post-raid
     * Remove equipped items from pre-raid
     * Add new items found in raid to profile
     * Store insurance items in profile
     * @param sessionID
     * @param pmcData Profile to update
     * @param postRaidProfile Profile returned by client after a raid
     * @returns Updated profile
     */
    static setInventory(sessionID, pmcData, postRaidProfile)
    {
        // store insurance (as removeItem removes insurance also)
        const insured = JsonUtil.clone(pmcData.InsuredItems);

        // remove possible equipped items from before the raid
        InventoryHelper.removeItem(
            pmcData,
            pmcData.Inventory.equipment,
            sessionID
        );
        InventoryHelper.removeItem(
            pmcData,
            pmcData.Inventory.questRaidItems,
            sessionID
        );
        InventoryHelper.removeItem(
            pmcData,
            pmcData.Inventory.sortingTable,
            sessionID
        );

        // add the new items
        pmcData.Inventory.items = [
            ...postRaidProfile.Inventory.items,
            ...pmcData.Inventory.items,
        ];
        pmcData.Inventory.fastPanel = postRaidProfile.Inventory.fastPanel;
        pmcData.InsuredItems = insured;

        return pmcData;
    }

    /**
     * Clear pmc inventory of all items except those that are exempt
     * Used post-raid to remove items after death
     * @param pmcData Player profile
     * @param sessionID Session id
     * @returns Player profile with pmc inventory cleared
     */
    static deleteInventory(pmcData, sessionID)
    {
        const toDelete = [];

        for (const item of pmcData.Inventory.items)
        {
            // Remove normal items only or quest raid items
            if (
                (item.parentId === pmcData.Inventory.equipment &&
                    !InRaidHelper.isItemKeptAfterDeath(item.slotId)) ||
                item.parentId === pmcData.Inventory.questRaidItems
            )
            {
                toDelete.push(item._id);
            }

            // Remove items in pockets
            if (item.slotId === "Pockets")
            {
                for (const itemInPocket of pmcData.Inventory.items.filter(
                    x => x.parentId === item._id
                ))
                {
                    // Don't delete items in special slots
                    // Can be special slot 1, 2 or 3
                    if (itemInPocket.slotId.includes("SpecialSlot"))
                    {
                        continue;
                    }

                    toDelete.push(itemInPocket._id);
                }
            }
        }

        // delete items
        for (const item of toDelete)
        {
            InventoryHelper.removeItem(pmcData, item, sessionID);
        }

        pmcData.Inventory.fastPanel = {};

        return pmcData;
    }

    /**
     * Does the provided items slotId mean its kept on the player after death
     * @param slotId slotid of item to check
     * @returns true if item is kept after death
     */
    static isItemKeptAfterDeath(slotId)
    {
        return ["SecuredContainer", "Scabbard", "Pockets", "ArmBand"].includes(
            slotId
        );
    }

    static getPlayerGear(items)
    {
        // Player Slots we care about
        const inventorySlots = [
            "FirstPrimaryWeapon",
            "SecondPrimaryWeapon",
            "Holster",
            "Scabbard",
            "Compass",
            "Headwear",
            "Earpiece",
            "Eyewear",
            "FaceCover",
            "ArmBand",
            "ArmorVest",
            "TacticalVest",
            "Backpack",
            "pocket1",
            "pocket2",
            "pocket3",
            "pocket4",
            "SecuredContainer",
        ];

        let inventoryItems = [];

        // Get an array of root player items
        for (const item of items)
        {
            if (inventorySlots.includes(item.slotId))
            {
                inventoryItems.push(item);
            }
        }

        // Loop through these items and get all of their children
        let newItems = inventoryItems;
        while (newItems.length > 0)
        {
            const foundItems = [];

            for (const item of newItems)
            {
                // Find children of this item
                for (const newItem of items)
                {
                    if (newItem.parentId === item._id)
                    {
                        foundItems.push(newItem);
                    }
                }
            }

            // Add these new found items to our list of inventory items
            inventoryItems = [...inventoryItems, ...foundItems];

            // Now find the children of these items
            newItems = foundItems;
        }

        return inventoryItems;
    }
}

module.exports = InRaidHelper;

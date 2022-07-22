"use strict";

require("../Lib.js");

class InraidController
{
    static onLoad(sessionID)
    {
        const profile = SaveServer.profiles[sessionID];

        if (!("inraid" in profile))
        {
            profile.inraid = {
                "location": "none",
                "character": "none"
            };
        }

        return profile;
    }

    static addPlayer(sessionID, location)
    {
        SaveServer.profiles[sessionID].inraid.location = location;
    }

    static removePlayer(sessionID)
    {
        SaveServer.profiles[sessionID].inraid.location = "none";
    }

    static removeMapAccessKey(offraidData, sessionID)
    {
        const locationName = SaveServer.profiles[sessionID].inraid.location.toLowerCase();
        const mapKey = DatabaseServer.tables.locations[locationName].base.AccessKeys[0];

        if (!mapKey)
        {
            return;
        }

        for (const item of offraidData.profile.Inventory.items)
        {
            if (item._tpl === mapKey && item.slotId !== "Hideout")
            {
                InventoryController.removeItem(offraidData.profile, item._id, sessionID);
                break;
            }
        }
    }

    static saveProgress(offraidData, sessionID)
    {
        if (!InraidConfig.save.loot)
        {
            return;
        }

        const locationName = SaveServer.profiles[sessionID].inraid.location.toLowerCase();

        const map = DatabaseServer.tables.locations[locationName].base;
        const insuranceEnabled = map.Insurance;
        let pmcData = ProfileController.getPmcProfile(sessionID);
        let scavData = ProfileController.getScavProfile(sessionID);
        const isPlayerScav = offraidData.isPlayerScav;
        const isDead = (offraidData.exit !== "survived" && offraidData.exit !== "runner");
        const preRaidGear = (isPlayerScav) ? [] : InraidController.getPlayerGear(pmcData.Inventory.items);

        SaveServer.profiles[sessionID].inraid.character = (isPlayerScav) ? "scav" : "pmc";

        if (isPlayerScav)
        {
            scavData = InraidController.setBaseStats(scavData, offraidData, sessionID);
        }
        else
        {
            pmcData = InraidController.setBaseStats(pmcData, offraidData, sessionID);
        }

        // Check for exit status
        if (offraidData.exit === "survived")
        {
            // mark found items and replace item ID's if the player survived
            offraidData.profile = InraidController.markFoundItems(pmcData, offraidData.profile, isPlayerScav);
        }
        else
        {
            // Or remove the FIR status if the player havn't survived
            offraidData.profile = InraidController.removeFoundItems(offraidData.profile);
        }

        offraidData.profile.Inventory.items = ItemHelper.replaceIDs(offraidData.profile, offraidData.profile.Inventory.items, pmcData.InsuredItems, offraidData.profile.Inventory.fastPanel);
        InraidController.addUpdToMoneyFromRaid(offraidData.profile.Inventory.items);

        // set profile equipment to the raid equipment
        if (isPlayerScav)
        {
            scavData = InraidController.setInventory(sessionID, scavData, offraidData.profile);
            HealthController.resetVitality(sessionID);
            ProfileController.setScavProfile(sessionID, scavData);

            // Scav karma
            const fenceID = TraderHelper.getTraderIdByName("fence");
            let fenceStanding = Number(pmcData.TradersInfo[fenceID].standing);

            InraidController.calculateFenceStandingChangeFromKills(fenceStanding, offraidData.profile.Stats.Victims);

            // successful extract with scav adds 0.01 standing
            if (offraidData.exit === "survived")
            {
                fenceStanding += InraidConfig.scavExtractGain;
            }

            if (!scavData.TradersInfo[fenceID])
            {
                scavData.TradersInfo[fenceID] = JsonUtil.clone(pmcData.TradersInfo[fenceID]);
            }

            scavData.TradersInfo[fenceID].standing = Math.min(Math.max(fenceStanding, -7), 6);
            pmcData.TradersInfo[fenceID].standing = scavData.TradersInfo[fenceID].standing;
            TraderController.lvlUp(fenceID, sessionID);
            pmcData.TradersInfo[fenceID].loyaltyLevel = Math.max(pmcData.TradersInfo[fenceID].loyaltyLevel, 1);

            // scav died, regen scav loadout and set timer
            if (isDead)
            {
                ProfileController.generatePlayerScav(sessionID);
            }

            return;
        }
        else
        {
            pmcData = InraidController.setInventory(sessionID, pmcData, offraidData.profile);
            HealthController.saveVitality(pmcData, offraidData.health, sessionID);
        }

        // remove inventory if player died and send insurance items
        // TODO: dump of prapor/therapist dialogues that are sent when you die in lab with insurance.
        if (insuranceEnabled)
        {
            InsuranceController.storeLostGear(pmcData, offraidData, preRaidGear, sessionID);
        }

        if (isDead)
        {
            if (insuranceEnabled)
            {
                InsuranceController.storeInsuredItemsForReturn(pmcData, offraidData, preRaidGear, sessionID);
            }

            pmcData = InraidController.deleteInventory(pmcData, sessionID);

            let carriedQuestItems = offraidData.profile.Stats.CarriedQuestItems;

            for (const questItem of carriedQuestItems)
            {
                const conditionId = QuestController.getFindItemIdForQuestItem(questItem);
                QuestController.resetProfileQuestCondition(sessionID, conditionId);
            }

            //Delete carried quests items
            carriedQuestItems = [];
        }

        if (insuranceEnabled)
        {
            InsuranceController.sendInsuredItems(pmcData, sessionID);
        }
    }

    static addUpdToMoneyFromRaid(items)
    {
        for (const item of items)
        {
            if (PaymentController.isMoneyTpl(item._tpl))
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
     * Add positive karma for PMC kills
     * @param {*} existingFenceStanding
     * @param {*} victims
     */
    static calculateFenceStandingChangeFromKills(existingFenceStanding, victims)
    {
        for (const victim of victims)
        {
            let standingForKill = null;
            if (victim.Side === "Savage")
            {
                standingForKill = DatabaseServer.tables.bots.types[victim.Role.toLowerCase()].experience.standingForKill;
            }
            else
            {
                standingForKill = DatabaseServer.tables.bots.types[victim.Side.toLowerCase()].experience.standingForKill;
            }

            if (standingForKill)
            {
                existingFenceStanding += standingForKill;
            }
            else
            {
                Logger.warning(`standing for kill not found for ${victim.Side}:${victim.Role}`);
            }
        }
    }

    static setBaseStats(profileData, offraidData, sessionID)
    {
        // remove old skill fatigue
        for (const skill of offraidData.profile.Skills.Common)
        {
            skill.PointsEarnedDuringSession = 0.0;
        }

        // set profile data
        profileData.Info.Level = offraidData.profile.Info.Level;
        profileData.Skills = offraidData.profile.Skills;
        profileData.Stats = offraidData.profile.Stats;
        profileData.Encyclopedia = offraidData.profile.Encyclopedia;
        profileData.ConditionCounters = offraidData.profile.ConditionCounters;
        profileData.Quests = offraidData.profile.Quests;

        profileData.SurvivorClass = offraidData.profile.SurvivorClass;

        // add experience points
        profileData.Info.Experience += profileData.Stats.TotalSessionExperience;
        profileData.Stats.TotalSessionExperience = 0;

        // Remove the Lab card
        InraidController.removeMapAccessKey(offraidData, sessionID);
        InraidController.removePlayer(sessionID);

        return profileData;
    }

    /* adds SpawnedInSession property to items found in a raid */
    static markFoundItems(pmcData, profile, isPlayerScav)
    {
        for (const item of profile.Inventory.items)
        {
            if (!isPlayerScav)
            {
                const existsInProfile = pmcData.Inventory.items.find((itemData) => item._id === itemData._id);

                if (existsInProfile)
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
                item.upd = { "SpawnedInSession": true };
            }
        }

        return profile;
    }

    static removeFoundItems(profile)
    {
        const items = DatabaseServer.tables.templates.items;

        for (const offraidItem of profile.Inventory.items)
        {
            // Remove the FIR status if the player died and the item marked FIR
            if ("upd" in offraidItem && "SpawnedInSession" in offraidItem.upd && !items[offraidItem._tpl]._props.QuestItem)
            {
                delete offraidItem.upd.SpawnedInSession;
            }

            continue;
        }

        return profile;
    }

    static setInventory(sessionID, pmcData, profile)
    {
        // store insurance (as removeItem removes insurance also)
        const insured = JsonUtil.clone(pmcData.InsuredItems);

        // remove possible equipped items from before the raid
        InventoryController.removeItem(pmcData, pmcData.Inventory.equipment, sessionID);
        InventoryController.removeItem(pmcData, pmcData.Inventory.questRaidItems, sessionID);
        InventoryController.removeItem(pmcData, pmcData.Inventory.sortingTable, sessionID);

        // add the new items
        pmcData.Inventory.items = [...profile.Inventory.items, ...pmcData.Inventory.items];
        pmcData.Inventory.fastPanel = profile.Inventory.fastPanel;
        pmcData.InsuredItems = insured;

        return pmcData;
    }

    static deleteInventory(pmcData, sessionID)
    {
        const toDelete = [];

        for (const item of pmcData.Inventory.items)
        {
            // remove normal item
            if (item.parentId === pmcData.Inventory.equipment
                && item.slotId !== "SecuredContainer"
                && item.slotId !== "Scabbard"
                && item.slotId !== "Pockets"
                && item.slotId !== "Compass"
                && item.slotId !== "ArmBand"
                || item.parentId === pmcData.Inventory.questRaidItems)
            {
                toDelete.push(item._id);
            }

            // remove pocket insides
            if (item.slotId === "Pockets")
            {
                for (const pocket of pmcData.Inventory.items)
                {
                    if (pocket.parentId === item._id)
                    {
                        toDelete.push(pocket._id);
                    }
                }
            }
        }

        // delete items
        for (const item of toDelete)
        {
            InventoryController.removeItem(pmcData, item, sessionID);
        }

        pmcData.Inventory.fastPanel = {};
        return pmcData;
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
            "SecuredContainer"
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
            inventoryItems = [
                ...inventoryItems,
                ...foundItems,
            ];

            // Now find the children of these items
            newItems = foundItems;
        }

        return inventoryItems;
    }
}

module.exports = InraidController;

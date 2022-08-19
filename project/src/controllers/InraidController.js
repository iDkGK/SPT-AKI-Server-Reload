"use strict";

require("../Lib.js");

class InraidController
{
    static addPlayer(sessionID, info)
    {
        SaveServer.getProfile(sessionID).inraid.location = info.locationId;
    }

    static saveProgress(offraidData, sessionID)
    {
        if (!InraidConfig.save.loot)
        {
            return;
        }

        const currentProfile = SaveServer.getProfile(sessionID);
        const locationName = currentProfile.inraid.location.toLowerCase();

        const map = DatabaseServer.getTables().locations[locationName].base;
        const insuranceEnabled = map.Insurance;
        let pmcData = ProfileHelper.getPmcProfile(sessionID);
        let scavData = ProfileHelper.getScavProfile(sessionID);
        const isPlayerScav = offraidData.isPlayerScav;
        const isDead =
            offraidData.exit !== "survived" && offraidData.exit !== "runner";
        const preRaidGear = isPlayerScav
            ? []
            : InRaidHelper.getPlayerGear(pmcData.Inventory.items);

        SaveServer.getProfile(sessionID).inraid.character = isPlayerScav
            ? "scav"
            : "pmc";

        if (isPlayerScav)
        {
            scavData = InRaidHelper.updateProfileBaseStats(
                scavData,
                offraidData,
                sessionID
            );
        }
        else
        {
            pmcData = InRaidHelper.updateProfileBaseStats(
                pmcData,
                offraidData,
                sessionID
            );
        }

        // Check for exit status
        InraidController.markOrRemoveFoundInRaidItems(
            offraidData,
            pmcData,
            isPlayerScav
        );

        offraidData.profile.Inventory.items = ItemHelper.replaceIDs(
            offraidData.profile,
            offraidData.profile.Inventory.items,
            pmcData.InsuredItems,
            offraidData.profile.Inventory.fastPanel
        );
        InRaidHelper.addUpdToMoneyFromRaid(offraidData.profile.Inventory.items);

        // set profile equipment to the raid equipment
        if (isPlayerScav)
        {
            InraidController.handlePostRaidPlayerScavProcess(
                scavData,
                sessionID,
                offraidData,
                pmcData,
                isDead
            );

            // Exit as pscavs have no insurance abilty and on death they get replaced with a fresh inventory
            return;
        }
        else
        {
            pmcData = InRaidHelper.setInventory(
                sessionID,
                pmcData,
                offraidData.profile
            );
            HealthHelper.saveVitality(pmcData, offraidData.health, sessionID);
        }

        // remove inventory if player died and send insurance items
        // TODO: dump of prapor/therapist dialogues that are sent when you die in lab with insurance.
        if (insuranceEnabled)
        {
            InsuranceService.storeLostGear(
                pmcData,
                offraidData,
                preRaidGear,
                sessionID
            );
        }

        if (isDead)
        {
            if (insuranceEnabled)
            {
                InsuranceService.storeInsuredItemsForReturn(
                    pmcData,
                    offraidData,
                    preRaidGear,
                    sessionID
                );
            }

            pmcData = InRaidHelper.deleteInventory(pmcData, sessionID);

            const carriedQuestItems =
                offraidData.profile.Stats.CarriedQuestItems;

            for (const questItem of carriedQuestItems)
            {
                const conditionId =
                    QuestHelper.getFindItemIdForQuestItem(questItem);
                ProfileHelper.resetProfileQuestCondition(
                    sessionID,
                    conditionId
                );
            }

            pmcData.Stats.CarriedQuestItems = [];
        }

        if (insuranceEnabled)
        {
            InsuranceService.sendInsuredItems(pmcData, sessionID, map.Id);
        }
    }

    /**
     * Mark inventory items as FiR if player survived raid, otherwise remove FiR from them
     * @param offraidData Save Progress Request
     * @param pmcData player profile
     * @param isPlayerScav Was the player a pScav
     */
    static markOrRemoveFoundInRaidItems(offraidData, pmcData, isPlayerScav)
    {
        if (offraidData.exit.toLowerCase() === "survived")
        {
            // Mark found items and replace item ID's if the player survived
            offraidData.profile =
                InRaidHelper.addSpawnedInSessionPropertyToItems(
                    pmcData,
                    offraidData.profile,
                    isPlayerScav
                );
        }
        else
        {
            // Remove FIR status if the player havn't survived
            offraidData.profile =
                InRaidHelper.removeSpawnedInSessionPropertyFromItems(
                    offraidData.profile
                );
        }
    }

    static handlePostRaidPlayerScavProcess(
        scavData,
        sessionID,
        offraidData,
        pmcData,
        isDead
    )
    {
        // Get scav inventory
        scavData = InRaidHelper.setInventory(
            sessionID,
            scavData,
            offraidData.profile
        );

        // reset hp and save hp to json
        HealthHelper.resetVitality(sessionID);
        SaveServer.getProfile(sessionID).characters.scav = scavData;

        // Scav karma
        InraidController.handlePostRaidPlayerScavKarmaChanges(
            pmcData,
            offraidData,
            scavData,
            sessionID
        );

        // scav died, regen scav loadout and set timer
        if (isDead)
        {
            PlayerScavGenerator.generate(sessionID);
        }

        // Update last played property
        pmcData.Info.LastTimePlayedAsSavage = TimeUtil.getTimestamp();
    }

    static handlePostRaidPlayerScavKarmaChanges(
        pmcData,
        offraidData,
        scavData,
        sessionID
    )
    {
        const fenceId = Traders.FENCE;

        let fenceStanding = Number(pmcData.TradersInfo[fenceId].standing);
        fenceStanding = InRaidHelper.calculateFenceStandingChangeFromKills(
            fenceStanding,
            offraidData.profile.Stats.Victims
        );

        // Successful extract with scav adds 0.01 standing
        if (offraidData.exit === "survived")
        {
            fenceStanding += InraidConfig.scavExtractGain;
        }

        // no fence trader info, copy from pmc profile
        if (!scavData.TradersInfo[fenceId])
        {
            scavData.TradersInfo[fenceId] = JsonUtil.clone(
                pmcData.TradersInfo[fenceId]
            );
        }

        // Make standing changes to scav profile
        scavData.TradersInfo[fenceId].standing = Math.min(
            Math.max(fenceStanding, -7),
            6
        );

        // Make standing changes to pmc profile
        pmcData.TradersInfo[fenceId].standing =
            scavData.TradersInfo[fenceId].standing;
        TraderHelper.lvlUp(fenceId, sessionID);
        pmcData.TradersInfo[fenceId].loyaltyLevel = Math.max(
            pmcData.TradersInfo[fenceId].loyaltyLevel,
            1
        );
    }
}

module.exports = InraidController;

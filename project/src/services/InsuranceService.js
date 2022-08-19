"use strict";

require("../Lib.js");

class InsuranceService
{
    static insured = {};

    static insuranceExists(sessionId)
    {
        return InsuranceService.insured[sessionId] !== undefined;
    }

    static insuranceTraderArrayExists(sessionId, traderId)
    {
        return InsuranceService.insured[sessionId][traderId] !== undefined;
    }

    static getInsurance(sessionId)
    {
        return InsuranceService.insured[sessionId];
    }

    static getInsuranceItems(sessionId, traderId)
    {
        return InsuranceService.insured[sessionId][traderId];
    }

    static resetInsurance(sessionId)
    {
        InsuranceService.insured[sessionId] = {};
    }

    static resetInsuranceTraderArray(sessionId, traderId)
    {
        InsuranceService.insured[sessionId][traderId] = [];
    }

    static addInsuranceItemToArray(sessionId, traderId, itemToAdd)
    {
        InsuranceService.insured[sessionId][traderId].push(itemToAdd);
    }

    /**
     * Get the rouble price for an item by templateId
     * @param itemTpl item tpl to get handbook price for
     * @returns handbook price in roubles, Return 0 if not found
     */
    static getItemPrice(itemTpl)
    {
        const item = DatabaseServer.getTables().templates.handbook.Items.find(x => x.Id === itemTpl);
        if (item)
        {
            return item.Price;
        }

        return 0;
    }

    /**
     * Sends stored insured items as message to player
     * @param pmcData profile to modify
     * @param sessionID SessionId of current player
     * @param mapId Id of the map player died/exited that caused the insurance to be issued on
     */
    static sendInsuredItems(pmcData, sessionID, mapId)
    {
        for (const traderId in InsuranceService.getInsurance(sessionID))
        {
            const insuranceReturnTimeBonus = pmcData.Bonuses.find(b => b.type === "InsuranceReturnTime");
            const insuranceReturnTimePercent = 1.0 - (insuranceReturnTimeBonus ? Math.abs(insuranceReturnTimeBonus.value) : 0) / 100;
            const trader = TraderHelper.getTrader(traderId, sessionID);
            const time = TimeUtil.getTimestamp() + (RandomUtil.getInt(trader.insurance.min_return_hour * TimeUtil.oneHourAsSeconds, trader.insurance.max_return_hour * TimeUtil.oneHourAsSeconds) * insuranceReturnTimePercent);
            const dialogueTemplates = DatabaseServer.getTables().traders[traderId].dialogue;
            let messageContent = DialogueHelper.createMessageContext(RandomUtil.getArrayValue(dialogueTemplates.insuranceStart), MessageType.NPC_TRADER, trader.insurance.max_storage_time);

            DialogueHelper.addDialogueMessage(traderId, messageContent, sessionID);

            messageContent = {
                templateId: RandomUtil.getArrayValue(dialogueTemplates.insuranceFound),
                type: MessageType.INSURANCE_RETURN,
                text: "", // live insurance returns have an empty string for the text property
                maxStorageTime: trader.insurance.max_storage_time * TimeUtil.oneHourAsSeconds,
                profileChangeEvents: [],
                systemData: {
                    date: TimeUtil.getDateMailFormat(),
                    time: TimeUtil.getTimeMailFormat(),
                    location: mapId
                }
            };

            // Remove 'hideout' slotid property on all insurance items
            for (const insuredItem of InsuranceService.getInsurance(sessionID)[traderId])
            {
                const isParentHere = InsuranceService.getInsurance(sessionID)[traderId].find(isParent => isParent._id === insuredItem.parentId);
                if (!isParentHere)
                {
                    insuredItem.slotId = "hideout";
                    delete insuredItem.location;
                }
            }

            SaveServer.getProfile(sessionID).insurance.push({
                scheduledTime: time,
                traderId: traderId,
                messageContent: messageContent,
                items: InsuranceService.getInsurance(sessionID)[traderId]
            });
        }

        InsuranceService.resetInsurance(sessionID);
    }

    /* store lost pmc gear */
    static storeLostGear(pmcData, offraidData, preRaidGear, sessionID)
    {
        const preRaidGearHash = {};
        const offRaidGearHash = {};
        const gears = [];

        // Build a hash table to reduce loops
        for (const item of preRaidGear)
        {
            preRaidGearHash[item._id] = item;
        }

        // Build a hash of offRaidGear
        for (const item of offraidData.profile.Inventory.items)
        {
            offRaidGearHash[item._id] = item;
        }

        for (const insuredItem of pmcData.InsuredItems)
        {
            if (preRaidGearHash[insuredItem.itemId])
            {
                // This item exists in preRaidGear, meaning we brought it into the raid...
                // Check if we brought it out of the raid
                if (!offRaidGearHash[insuredItem.itemId])
                {
                    // We didn't bring this item out! We must've lost it.
                    gears.push({
                        "pmcData": pmcData,
                        "insuredItem": insuredItem,
                        "item": preRaidGearHash[insuredItem.itemId],
                        "sessionID": sessionID
                    });
                }
            }
        }

        for (const gear of gears)
        {
            InsuranceService.addGearToSend(gear.pmcData, gear.insuredItem, gear.item, gear.sessionID);
        }
    }

    /* store insured items on pmc death */
    static storeInsuredItemsForReturn(pmcData, offraidData, preRaidGear, sessionID)
    {
        const preRaidGearDictionary = {};
        const pmcItemsDictionary = {};
        const itemsToReturn = [];

        const securedContainerItemArray = SecureContainerHelper.getSecureContainerItems(offraidData.profile.Inventory.items);

        for (const item of preRaidGear)
        {
            preRaidGearDictionary[item._id] = item;
        }

        for (const item of pmcData.Inventory.items)
        {
            pmcItemsDictionary[item._id] = item;
        }

        for (const insuredItem of pmcData.InsuredItems)
        {
            if (preRaidGearDictionary[insuredItem.itemId]
                && !(securedContainerItemArray.includes(insuredItem.itemId))
                && !(typeof pmcItemsDictionary[insuredItem.itemId] === "undefined")
                && !(pmcItemsDictionary[insuredItem.itemId].slotId === "SecuredContainer"))
            {
                itemsToReturn.push({ "pmcData": pmcData, "insuredItem": insuredItem, "item": pmcItemsDictionary[insuredItem.itemId], "sessionID": sessionID });
            }
        }

        for (const item of itemsToReturn)
        {
            InsuranceService.addGearToSend(item.pmcData, item.insuredItem, item.item, item.sessionID);
        }
    }

    /* adds gear to store */
    static addGearToSend(pmcData, insuredItem, actualItem, sessionID)
    {
        // Don't process insurance for melee weapon, secure container, compass or armband.
        if (InsuranceConfig.blacklistedEquipment.includes(actualItem.slotId))
        {
            return;
        }

        const pocketSlots = [
            "pocket1",
            "pocket2",
            "pocket3",
            "pocket4"
        ];

        // Check and correct the validity of the slotId.
        if (!("slotId" in actualItem) || pocketSlots.includes(actualItem.slotId) || !isNaN(actualItem.slotId))
        {
            actualItem.slotId = "hideout";
        }

        // Mark root-level items for later.
        if (actualItem.parentId === pmcData.Inventory.equipment)
        {
            actualItem.slotId = "hideout";
        }

        // Clear the location attribute of the item in the container.
        if (actualItem.slotId === "hideout" && "location" in actualItem)
        {
            delete actualItem.location;
        }

        // Remove found in raid
        if ("upd" in actualItem && "SpawnedInSession" in actualItem.upd)
        {
            actualItem.upd.SpawnedInSession = false;
        }

        // Mark to add to insurance
        if (!InsuranceService.insuranceExists(sessionID))
        {
            InsuranceService.resetInsurance(sessionID);
        }

        if (!InsuranceService.insuranceTraderArrayExists(sessionID, insuredItem.tid))
        {
            InsuranceService.resetInsuranceTraderArray(sessionID, insuredItem.tid);
        }

        InsuranceService.addInsuranceItemToArray(sessionID, insuredItem.tid, actualItem);

        pmcData.InsuredItems = pmcData.InsuredItems.filter((item) =>
        {
            return item.itemId !== insuredItem.itemId;
        });
    }

    static getPremium(pmcData, inventoryItem, traderId)
    {
        let insuranceMultiplier = InsuranceConfig.insuranceMultiplier[traderId];
        if (!insuranceMultiplier)
        {
            insuranceMultiplier = 0.3;
            Logger.warning(`No multiplier found for trader ${traderId}, check it exists in InsuranceConfig.js, falling back to a default value of 0.3`);
        }

        let premium = InsuranceService.getItemPrice(inventoryItem._tpl) * insuranceMultiplier;
        const coef = TraderHelper.getLoyaltyLevel(traderId, pmcData).insurance_price_coef;

        if (coef > 0)
        {
            premium *= (1 - TraderHelper.getLoyaltyLevel(traderId, pmcData).insurance_price_coef / 100);
        }

        return Math.round(premium);
    }
}

module.exports = InsuranceService;
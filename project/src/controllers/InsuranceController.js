"use strict";

require("../Lib.js");

class InsuranceController
{
    static insured = {};
    static templatesById = {};

    static onLoad(sessionID)
    {
        InsuranceController.generateTemplatesById();
        const profile = SaveServer.getProfile(sessionID);

        if (!("insurance" in profile))
        {
            profile.insurance = [];
        }

        return profile;
    }

    static resetInsurance(sessionID)
    {
        InsuranceController.insured[sessionID] = {};
    }

    /* adds gear to store */
    static addGearToSend(pmcData, insuredItem, actualItem, sessionID)
    {
        // Don't process insurance for melee weapon, secure container, compass or armband.
        if (
            actualItem.slotId === "Scabbard" ||
            actualItem.slotId === "SecuredContainer" ||
            actualItem.slotId === "Compass" ||
            actualItem.slotId === "ArmBand"
        )
        {
            return;
        }

        const pocketSlots = ["pocket1", "pocket2", "pocket3", "pocket4"];

        // Check and correct the validity of the slotId.
        if (
            !("slotId" in actualItem) ||
            pocketSlots.includes(actualItem.slotId) ||
            !isNaN(actualItem.slotId)
        )
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
        InsuranceController.insured[sessionID] =
            InsuranceController.insured[sessionID] || {};
        InsuranceController.insured[sessionID][insuredItem.tid] =
            InsuranceController.insured[sessionID][insuredItem.tid] || [];
        InsuranceController.insured[sessionID][insuredItem.tid].push(
            actualItem
        );

        pmcData.InsuredItems = pmcData.InsuredItems.filter(item =>
        {
            return item.itemId !== insuredItem.itemId;
        });
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
                        pmcData: pmcData,
                        insuredItem: insuredItem,
                        item: preRaidGearHash[insuredItem.itemId],
                        sessionID: sessionID,
                    });
                }
            }
        }

        for (const gear of gears)
        {
            InsuranceController.addGearToSend(
                gear.pmcData,
                gear.insuredItem,
                gear.item,
                gear.sessionID
            );
        }
    }

    /* store insured items on pmc death */
    static storeInsuredItemsForReturn(
        pmcData,
        offraidData,
        preRaidGear,
        sessionID
    )
    {
        const preRaidGearDictionary = {};
        const pmcItemsDictionary = {};
        const itemsToReturn = [];

        const securedContainerItemArray =
            InventoryHelper.getSecureContainerItems(
                offraidData.profile.Inventory.items
            );

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
            if (
                preRaidGearDictionary[insuredItem.itemId] &&
                !securedContainerItemArray.includes(insuredItem.itemId) &&
                !(
                    typeof pmcItemsDictionary[insuredItem.itemId] ===
                    "undefined"
                ) &&
                !(
                    pmcItemsDictionary[insuredItem.itemId].slotId ===
                    "SecuredContainer"
                )
            )
            {
                itemsToReturn.push({
                    pmcData: pmcData,
                    insuredItem: insuredItem,
                    item: pmcItemsDictionary[insuredItem.itemId],
                    sessionID: sessionID,
                });
            }
        }

        for (const item of itemsToReturn)
        {
            InsuranceController.addGearToSend(
                item.pmcData,
                item.insuredItem,
                item.item,
                item.sessionID
            );
        }
    }

    /* sends stored insured items as message */
    static sendInsuredItems(pmcData, sessionID)
    {
        for (const traderId in InsuranceController.insured[sessionID])
        {
            const insuranceReturnTimeBonus = pmcData.Bonuses.find(
                b => b.type === "InsuranceReturnTime"
            );
            const insuranceReturnTimePercent =
                1.0 -
                (insuranceReturnTimeBonus
                    ? Math.abs(insuranceReturnTimeBonus.value)
                    : 0) /
                    100;
            const trader = TraderHelper.getTrader(traderId, sessionID);
            const time =
                TimeUtil.getTimestamp() +
                RandomUtil.getInt(
                    trader.insurance.min_return_hour *
                        TimeUtil.oneHourAsSeconds,
                    trader.insurance.max_return_hour * TimeUtil.oneHourAsSeconds
                ) *
                    insuranceReturnTimePercent;
            const dialogueTemplates =
                DatabaseServer.tables.traders[traderId].dialogue;
            let messageContent = DialogueHelper.createMessageContext(
                RandomUtil.getArrayValue(dialogueTemplates.insuranceStart),
                DialogueHelper.getMessageTypeValue("npcTrader"),
                undefined
            );

            DialogueHelper.addDialogueMessage(
                traderId,
                messageContent,
                sessionID
            );

            messageContent = {
                templateId: RandomUtil.getArrayValue(
                    dialogueTemplates.insuranceFound
                ),
                type: DialogueHelper.getMessageTypeValue("insuranceReturn"),
                maxStorageTime:
                    trader.insurance.max_storage_time *
                    TimeUtil.oneHourAsSeconds,
                systemData: {
                    date: TimeUtil.getDate(),
                    time: TimeUtil.getTime(),
                    location: pmcData.Info.EntryPoint,
                },
            };

            for (const insuredItem of InsuranceController.insured[sessionID][
                traderId
            ])
            {
                const isParentHere = InsuranceController.insured[sessionID][
                    traderId
                ].find(isParent => isParent._id === insuredItem.parentId);
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
                items: InsuranceController.insured[sessionID][traderId],
            });
        }

        InsuranceController.resetInsurance(sessionID);
    }

    static processReturn()
    {
        const time = TimeUtil.getTimestamp();

        for (const sessionID in SaveServer.getProfiles())
        {
            const insurance = SaveServer.getProfile(sessionID).insurance;
            let i = insurance.length;

            while (i-- > 0)
            {
                const insured = insurance[i];

                if (time < insured.scheduledTime)
                {
                    continue;
                }
                // Inject a little bit of a surprise by failing the insurance from time to time ;)
                const toLook = [
                    "hideout",
                    "main",
                    "mod_scope",
                    "mod_magazine",
                    "mod_sight_rear",
                    "mod_sight_front",
                    "mod_tactical",
                    "mod_muzzle",
                    "mod_tactical_2",
                    "mod_foregrip",
                    "mod_tactical_000",
                    "mod_tactical_001",
                    "mod_tactical_002",
                    "mod_tactical_003",
                    "mod_nvg",
                ];
                const toDelete = [];

                for (const insuredItem of insured.items)
                {
                    // @Cleanup: what does isNaN mean in this context. is it needed?
                    // if ((toLook.includes(insuredItem.slotId) || !isNaN(insuredItem.slotId)) && RandomUtil.getInt(0, 99) >= InsuranceConfig.returnChancePercent[insured.traderId] && !toDelete.includes(insuredItem._id))
                    if (
                        toLook.includes(insuredItem.slotId) &&
                        RandomUtil.getInt(0, 99) >=
                            InsuranceConfig.returnChancePercent[
                                insured.traderId
                            ] &&
                        !toDelete.includes(insuredItem._id)
                    )
                    {
                        toDelete.push(
                            ...ItemHelper.findAndReturnChildrenByItems(
                                insured.items,
                                insuredItem._id
                            )
                        );
                    }
                }

                for (let pos = insured.items.length - 1; pos >= 0; --pos)
                {
                    if (toDelete.includes(insured.items[pos]._id))
                    {
                        insured.items.splice(pos, 1);
                    }
                }

                if (insured.items.length === 0)
                {
                    const insuranceFailedTemplates =
                        DatabaseServer.tables.traders[insured.traderId].dialogue
                            .insuranceFailed;
                    insured.messageContent.templateId =
                        RandomUtil.getArrayValue(insuranceFailedTemplates);
                }

                DialogueHelper.addDialogueMessage(
                    insured.traderId,
                    insured.messageContent,
                    sessionID,
                    insured.items
                );
                insurance.splice(i, 1);
            }

            SaveServer.getProfile(sessionID).insurance = insurance;
        }
    }

    /* add insurance to an item */
    static insure(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        const itemsToPay = [];
        const inventoryItemsHash = {};

        for (const item of pmcData.Inventory.items)
        {
            inventoryItemsHash[item._id] = item;
        }

        // get the price of all items
        for (const key of body.items)
        {
            itemsToPay.push({
                id: inventoryItemsHash[key]._id,
                count: Math.round(
                    InsuranceController.getPremium(
                        pmcData,
                        inventoryItemsHash[key],
                        body.tid
                    )
                ),
            });
        }

        const options = {
            scheme_items: itemsToPay,
            tid: body.tid,
            Action: "",
            type: "",
            item_id: "",
            count: 0,
            scheme_id: 0,
        };

        // pay for the item insurance
        output = PaymentService.payMoney(pmcData, options, sessionID, output);

        if (output.warnings.length > 0)
        {
            return output;
        }

        // add items to InsuredItems list once money has been paid
        for (const key of body.items)
        {
            pmcData.InsuredItems.push({
                tid: body.tid,
                itemId: inventoryItemsHash[key]._id,
            });
        }

        return output;
    }

    static generateTemplatesById()
    {
        if (Object.keys(InsuranceController.templatesById).length === 0)
        {
            for (const item of DatabaseServer.tables.templates.handbook.Items)
            {
                InsuranceController.templatesById[item.Id] = item;
            }
        }
    }

    // TODO: Move to helper functions
    static getItemPrice(_tpl)
    {
        let price = 0;

        if (InsuranceController.templatesById[_tpl] !== undefined)
        {
            const template = InsuranceController.templatesById[_tpl];
            price = template.Price;
        }
        else
        {
            const item = DatabaseServer.tables.templates.clientItems[_tpl];
            price = item._props.CreditsPrice;
        }

        return price;
    }

    static getPremium(pmcData, inventoryItem, traderId)
    {
        let insuranceMultiplier = InsuranceConfig.insuranceMultiplier[traderId];
        if (!insuranceMultiplier)
        {
            insuranceMultiplier = 0.3;
            Logger.warning(
                `No multiplier found for trader ${traderId}, check it exists in InsuranceConfig.js, falling back to a default value of 0.3`
            );
        }

        let premium =
            InsuranceController.getItemPrice(inventoryItem._tpl) *
            insuranceMultiplier;
        const coef = TraderHelper.getLoyaltyLevel(
            traderId,
            pmcData
        ).insurance_price_coef;

        if (coef > 0)
        {
            premium *=
                1 -
                TraderHelper.getLoyaltyLevel(traderId, pmcData)
                    .insurance_price_coef /
                    100;
        }

        return Math.round(premium);
    }

    /* calculates insurance cost */
    static cost(info, sessionID)
    {
        const output = {};
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const inventoryItemsHash = {};

        for (const item of pmcData.Inventory.items)
        {
            inventoryItemsHash[item._id] = item;
        }

        for (const trader of info.traders)
        {
            const items = {};

            for (const key of info.items)
            {
                items[inventoryItemsHash[key]._tpl] = Math.round(
                    InsuranceController.getPremium(
                        pmcData,
                        inventoryItemsHash[key],
                        trader
                    )
                );
            }

            output[trader] = items;
        }

        return output;
    }
}

module.exports = InsuranceController;

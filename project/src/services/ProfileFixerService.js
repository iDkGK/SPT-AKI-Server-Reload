"use strict";

require("../Lib.js");

class ProfileFixerService
{
    /**
     * Find issues in the pmc profile data that may cause issues and fix them
     * @param pmcProfile profile to check and fix
     */
    static checkForAndFixPmcProfileIssues(pmcProfile)
    {
        ProfileFixerService.removeDanglingConditionCounters(pmcProfile);
        ProfileFixerService.removeDanglingBackendCounters(pmcProfile);
        ProfileFixerService.addMissingRepeatableQuestsProperty(pmcProfile);

        if (pmcProfile.Hideout)
        {
            ProfileFixerService.addMissingBonusesProperty(pmcProfile);
            ProfileFixerService.addMissingArmorRepairSkill(pmcProfile);
            ProfileFixerService.addMissingWorkbenchWeaponSkills(pmcProfile);

            ProfileFixerService.removeResourcesFromSlotsInHideoutWithoutLocationIndexValue(pmcProfile);

            ProfileFixerService.reorderHideoutAreasWithResouceInputs(pmcProfile);

            if (pmcProfile.Hideout.Areas[HideoutAreas.GENERATOR].slots.length <
                (6 + DatabaseServer.getTables().globals.config.SkillsSettings.HideoutManagement.EliteSlots.Generator.Slots))
            {
                Logger.debug("Updating generator area slots to a size of 6 + hideout management skill");
                ProfileFixerService.addEmptyObjectsToHideoutAreaSlots(HideoutAreas.GENERATOR, (6 + DatabaseServer.getTables().globals.config.SkillsSettings.HideoutManagement.EliteSlots.Generator.Slots), pmcProfile);
            }

            if (pmcProfile.Hideout.Areas[HideoutAreas.WATER_COLLECTOR].slots.length < (1 + DatabaseServer.getTables().globals.config.SkillsSettings.HideoutManagement.EliteSlots.WaterCollector.Slots))
            {
                Logger.debug("Updating water collector area slots to a size of 1 + hideout management skill");
                ProfileFixerService.addEmptyObjectsToHideoutAreaSlots(HideoutAreas.WATER_COLLECTOR, (1 + DatabaseServer.getTables().globals.config.SkillsSettings.HideoutManagement.EliteSlots.WaterCollector.Slots), pmcProfile);
            }

            if (pmcProfile.Hideout.Areas[HideoutAreas.AIR_FILTERING].slots.length < (3 + DatabaseServer.getTables().globals.config.SkillsSettings.HideoutManagement.EliteSlots.AirFilteringUnit.Slots))
            {
                Logger.debug("Updating air filter area slots to a size of 3 + hideout management skill");
                ProfileFixerService.addEmptyObjectsToHideoutAreaSlots(HideoutAreas.AIR_FILTERING, (3 + DatabaseServer.getTables().globals.config.SkillsSettings.HideoutManagement.EliteSlots.AirFilteringUnit.Slots), pmcProfile);
            }

            // BTC Farm doesnt have extra slots for hideout management, but we still check for modded stuff!!
            if (pmcProfile.Hideout.Areas[HideoutAreas.BITCOIN_FARM].slots.length < (50 + DatabaseServer.getTables().globals.config.SkillsSettings.HideoutManagement.EliteSlots.BitcoinFarm.Slots))
            {
                Logger.debug("Updating bitcoin farm area slots to a size of 50 + hideout management skill");
                ProfileFixerService.addEmptyObjectsToHideoutAreaSlots(HideoutAreas.BITCOIN_FARM, (50 + DatabaseServer.getTables().globals.config.SkillsSettings.HideoutManagement.EliteSlots.BitcoinFarm.Slots), pmcProfile);
            }
        }

        ProfileFixerService.fixNullTraderSalesSums(pmcProfile);
        ProfileFixerService.updateProfilePocketsToNewId(pmcProfile);
        ProfileFixerService.updateProfileQuestDataValues(pmcProfile);
    }

    /**
     * Add tag to profile to indicate when it was made
     * @param fullProfile
     */
    static addMissingAkiVersionTagToProfile(fullProfile)
    {
        if (!fullProfile.aki)
        {
            fullProfile.aki = {
                version: Watermark.getVersionTag()
            };
        }
    }

    /**
     * TODO - make this non-static - currently used by RepeatableQuestController
     * Remove unused condition counters
     * @param pmcProfile profile to remove old counters from
     */
    static removeDanglingConditionCounters(pmcProfile)
    {
        if (pmcProfile.ConditionCounters)
        {
            pmcProfile.ConditionCounters.Counters = pmcProfile.ConditionCounters.Counters.filter(c => c.qid !== undefined);
        }
    }

    static removeDanglingBackendCounters(pmcProfile)
    {
        if (pmcProfile.BackendCounters)
        {
            const counterKeysToRemove = [];
            const activeQuests = ProfileFixerService.getActiveRepeatableQuests(pmcProfile.RepeatableQuests);
            for (const [key, backendCounter] of Object.entries(pmcProfile.BackendCounters))
            {
                if (pmcProfile.RepeatableQuests && activeQuests.length > 0)
                {
                    const matchingQuest = activeQuests.filter(x => x._id === backendCounter.qid);
                    const quest = pmcProfile.Quests.filter(q => q.qid === backendCounter.qid);

                    // if BackendCounter's quest is neither in activeQuests nor Quests it's stale
                    if (matchingQuest.length === 0 && quest.length === 0)
                    {
                        counterKeysToRemove.push(key);
                    }
                }
            }

            for (const counterKeyToRemove of counterKeysToRemove)
            {
                delete pmcProfile.BackendCounters[counterKeyToRemove];
            }
        }
    }

    static getActiveRepeatableQuests(repeatableQuests)
    {
        let activeQuests = [];
        repeatableQuests.forEach(x =>
        {
            if (x.activeQuests.length > 0)
            {
                // daily/weekly collection has active quests in them, add to array and return
                activeQuests = activeQuests.concat(x.activeQuests);
            }
        });

        return activeQuests;
    }

    static fixNullTraderSalesSums(pmcProfile)
    {
        for (const traderId in pmcProfile.TradersInfo)
        {
            const trader = pmcProfile.TradersInfo[traderId];
            if (trader && (trader.salesSum === undefined || trader.salesSum === null))
            {
                Logger.warning(`trader ${traderId} has a null salesSum value, resetting to 0.`);
                trader.salesSum = 0;
            }
        }
    }

    static addMissingBonusesProperty(pmcProfile)
    {
        if (typeof pmcProfile["Bonuses"] === "undefined")
        {
            pmcProfile["Bonuses"] = [];
            Logger.debug("Missing Bonuses property added to profile");
        }
    }

    /**
     * Adjust profile quest status and statusTimers object values
     * quest.status is numeric e.g. 2
     * quest.statusTimers keys are numeric as strings e.g. "2"
     * @param pmcProfile profile to update
     */
    static updateProfileQuestDataValues(pmcProfile)
    {
        if (!pmcProfile.Quests)
        {
            return;
        }
        const fixes = new Map();
        for (const quest of pmcProfile.Quests)
        {
            if (quest.status && !Number(quest.status))
            {
                if (fixes.has(quest.status))
                    fixes.set(quest.status, fixes.get(quest.status) + 1);
                else
                    fixes.set(quest.status, 1);

                const newQuestStatus = QuestStatus[quest.status];
                quest.status = newQuestStatus;

                for (const statusTimer in quest.statusTimers)
                {
                    if (!Number(statusTimer))
                    {
                        const newKey = QuestStatus[statusTimer];
                        quest.statusTimers[newKey] = quest.statusTimers[statusTimer];
                        delete quest.statusTimers[statusTimer];
                    }
                }
            }
        }

        if (fixes.size > 0)
            Logger.debug(`Updated quests values: ${Array.from(fixes.entries()).map(([k, v]) => `(${k}: ${v} times)`).join(", ")}`);
    }

    static addMissingRepeatableQuestsProperty(pmcProfile)
    {
        if (pmcProfile.RepeatableQuests)
        {
            let repeatablesCompatible = true;
            for (const currentRepeatable of pmcProfile.RepeatableQuests)
            {
                if (
                    !currentRepeatable.changeRequirement ||
                    !currentRepeatable.activeQuests.every(x => (typeof x.changeCost !== "undefined" && typeof x.changeStandingCost !== "undefined"))
                )
                {
                    repeatablesCompatible = false;
                    break;
                }
            }

            if (!repeatablesCompatible)
            {
                pmcProfile.RepeatableQuests = [];
                Logger.debug("Missing RepeatableQuests property added to profile");
            }
        }
    }

    static addMissingWorkbenchWeaponSkills(pmcProfile)
    {
        const workbench = pmcProfile.Hideout.Areas.find(x => x.type === HideoutAreas.WORKBENCH);
        if (workbench)
        {
            if (workbench.level > 0)
            {
                const weaponRepairBonus = pmcProfile.Bonuses.find(x => x.type === "UnlockWeaponRepair");
                if (!weaponRepairBonus)
                {
                    pmcProfile.Bonuses.push(
                        {
                            type: "UnlockWeaponRepair",
                            value: 1,
                            passive: true,
                            production: false,
                            visible: true
                        }
                    );

                    Logger.debug("Missing UnlockWeaponRepair bonus added to profile");
                }

                const weaponModificationBonus = pmcProfile.Bonuses.find(x => x.type === "UnlockWeaponModification");
                if (!weaponModificationBonus)
                {
                    pmcProfile.Bonuses.push(
                        {
                            type: "UnlockWeaponModification",
                            value: 1,
                            passive: true,
                            production: false,
                            visible: false
                        }
                    );

                    Logger.debug("Missing UnlockWeaponModification bonus added to profile");
                }
            }
        }
    }

    /**
     * A new property was added to slot items "locationIndex", if this is missing, the hideout slot item must be removed
     * @param pmcProfile Profile to find and remove slots from
     */
    static removeResourcesFromSlotsInHideoutWithoutLocationIndexValue(pmcProfile)
    {
        for (const area of pmcProfile.Hideout.Areas)
        {
            // Skip areas with no resource slots
            if (area.slots.length === 0)
            {
                continue;
            }

            // Only slots with location index
            area.slots = area.slots.filter(x => "locationIndex" in x);

            // Only slots that:
            // Have an item property and it has at least one item in it
            // Or
            // Have no item property
            area.slots = area.slots.filter(x => "item" in x && x.item?.length > 0 || !("item" in x));
        }
    }

    /**
     * Hideout slots need to be in a specific order, locationIndex in ascending order
     * @param pmcProfile profile to edit
     */
    static reorderHideoutAreasWithResouceInputs(pmcProfile)
    {
        const areasToCheck = [HideoutAreas.AIR_FILTERING, HideoutAreas.GENERATOR, HideoutAreas.BITCOIN_FARM, HideoutAreas.WATER_COLLECTOR];

        for (const areaId of areasToCheck)
        {
            const area = pmcProfile.Hideout.Areas[areaId];

            if (!area)
            {
                Logger.debug(`unable to sort ${areaId} slots, no area found`);
                continue;
            }

            if (!area.slots ||  area.slots.length === 0)
            {
                Logger.debug(`unable to sort ${areaId} slots, no slots found`);
                continue;
            }

            area.slots = area.slots.sort((a, b) =>
            {
                return a.locationIndex > b.locationIndex ? 1 : -1;
            });
        }
    }

    /**
     * add in objects equal to the number of slots
     * @param areaType area to check
     * @param pmcProfile profile to update
     */
    static addEmptyObjectsToHideoutAreaSlots(areaType, emptyItemCount, pmcProfile)
    {

        const area = pmcProfile.Hideout.Areas.find(x => x.type === areaType);
        area.slots = ProfileFixerService.addObjectsToArray(emptyItemCount, area.slots);
    }

    static addObjectsToArray(count, slots)
    {
        for (let i = 0; i < count; i++)
        {
            if (!slots.find(x => x.locationIndex === i))
            {
                slots.push({ locationIndex: i });
            }
        }

        return slots;

    }

    /**
     * In 18876 bsg changed the pockets tplid to be one that has 3 additional special slots
     * @param pmcProfile
     */
    static updateProfilePocketsToNewId(pmcProfile)
    {
        const pocketItem = pmcProfile.Inventory?.items?.find(x => x.slotId === "Pockets");
        if (pocketItem)
        {
            if (pocketItem._tpl === "557ffd194bdc2d28148b457f")
            {
                Logger.success("Updated 'pocket' item to new 18876 version with x3 special slots");
                pocketItem._tpl = "627a4e6b255f7527fb05a0f6";
            }
        }
    }

    static addMissingArmorRepairSkill(pmcProfile)
    {
        const lavatory = pmcProfile.Hideout.Areas.find(x => x.type === HideoutAreas.LAVATORY);
        if (lavatory)
        {
            if (lavatory.level > 0)
            {
                const hasBonus = pmcProfile.Bonuses.find(x => x.type === "UnlockArmorRepair");
                if (!hasBonus)
                {
                    pmcProfile.Bonuses.push(
                        {
                            type: "UnlockArmorRepair",
                            value: 1,
                            passive: true,
                            production: false,
                            visible: true
                        }
                    );

                    Logger.debug("Missing UnlockArmorRepair bonus added to profile");
                }
            }
        }
    }
}

module.exports = ProfileFixerService;

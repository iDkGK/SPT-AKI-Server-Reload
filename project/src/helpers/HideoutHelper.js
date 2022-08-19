"use strict";

require("../Lib.js");

class HideoutHelper
{
    static get bitcoinFarm()
    {
        return "5d5c205bd582a50d042a3c0e";
    }

    static get waterCollector()
    {
        return "5d5589c1f934db045e6c5492";
    }

    static get bitcoin()
    {
        return "59faff1d86f7746c51718c9c";
    }

    static get expeditionaryFuelTank()
    {
        return "5d1b371186f774253763a656";
    }

    static registerProduction(pmcData, body, sessionID)
    {
        const recipe = DatabaseServer.getTables().hideout.production.find(
            p => p._id === body.recipeId
        );
        if (!recipe)
        {
            Logger.error(`Failed to locate recipe with _id ${body.recipeId}`);
            return HttpResponseUtil.appendErrorToOutput(
                ItemEventRouter.getOutput(sessionID)
            );
        }

        // @Important: Here we need to be very exact:
        // - normal recipe: Production time value is stored in attribute "productionType" with small "p"
        // - scav case recipe: Production time value is stored in attribute "ProductionType" with capital "P"
        pmcData.Hideout.Production[body.recipeId] =
            HideoutHelper.initProduction(body.recipeId, recipe.productionTime);
    }

    /**
     * This convinience function intialies new Production Object
     * with all the constants.
     */
    static initProduction(recipeId, productionTime)
    {
        return {
            Progress: 0,
            inProgress: true,
            RecipeId: recipeId,
            Products: [],
            SkipTime: 0,
            ProductionTime: productionTime,
            StartTimestamp: TimeUtil.getTimestamp(),
        };
    }

    static isProductionType(productive)
    {
        return (
            productive.Progress !== undefined ||
            productive.RecipeId !== undefined
        );
    }

    // BALIST0N, I got bad news for you
    // we do need to implement these after all
    // ...
    // with that I mean manual implementation
    // RIP, GL whoever is going to do this
    static applyPlayerUpgradesBonuses(pmcData, bonus)
    {
        switch (bonus.type)
        {
            case "StashSize":
                for (const item in pmcData.Inventory.items)
                {
                    if (
                        pmcData.Inventory.items[item]._id ===
                        pmcData.Inventory.stash
                    )
                    {
                        pmcData.Inventory.items[item]._tpl = bonus.templateId;
                    }
                }
                break;
            case "MaximumEnergyReserve":
                pmcData.Health.Energy.Maximum = 110;
                break;
            case "EnergyRegeneration":
            case "HydrationRegeneration":
            case "HealthRegeneration":
            case "DebuffEndDelay":
            case "QuestMoneyReward":
            case "ExperienceRate":
            case "SkillGroupLevelingBoost":
                HideoutHelper.applySkillXPBoost(pmcData, bonus);
                break;
            case "ScavCooldownTimer":
            case "InsuranceReturnTime":
            case "RagfairCommission":
            case "FuelConsumption":
                // These skill is being applied automatically on the RagfairController, InsuranceController, ProfileController, HideoutController
                // ScavCooldownTimer, InsuranceReturnTime, RagfairCommission, FuelConsumption
                break;
            case "AdditionalSlots":
                // Some of these are also implemented on the HideoutController
                break;
            case "UnlockWeaponModification":
            case "RepairArmorBonus":
            case "RepairWeaponBonus":
            case "UnlockArmorRepair":
            case "UnlockWeaponRepair":
            case "TextBonus":
                break;
        }

        pmcData.Bonuses.push(bonus);
    }

    // TODO:
    // After looking at the skills there doesnt seem to be a configuration per skill to boost
    // the XP gain PER skill. I THINK you should be able to put the variable "SkillProgress" (just like health has it)
    // and be able to tune the skill gain PER skill, but I havent tested it and Im not sure!
    static applySkillXPBoost(pmcData, bonus)
    {
        const skillGroupType = bonus.skillType;
        if (skillGroupType)
        {
            switch (skillGroupType)
            {
                case "Physical":
                case "Mental":
                case "Combat":
                case "Practical":
                case "Special":
                default:
                    break;
            }
        }
    }

    static updatePlayerHideout(sessionID)
    {
        const recipes = DatabaseServer.getTables().hideout.production;
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        let btcFarmCGs = 0;
        let isGeneratorOn = false;
        let waterCollectorHasFilter = false;

        for (let area of pmcData.Hideout.Areas)
        {
            switch (area.type)
            {
                case HideoutAreas.GENERATOR:
                    isGeneratorOn = area.active;

                    if (isGeneratorOn)
                    {
                        area = HideoutHelper.updateFuel(area, pmcData);
                    }
                    break;

                case HideoutAreas.WATER_COLLECTOR:
                    HideoutHelper.updateWaterCollector(
                        sessionID,
                        pmcData,
                        area,
                        isGeneratorOn
                    );
                    waterCollectorHasFilter =
                        HideoutHelper.doesWaterCollectorHaveFilter(area);

                    break;

                case HideoutAreas.AIR_FILTERING:
                    if (isGeneratorOn)
                    {
                        area = HideoutHelper.updateAirFilters(area, pmcData);
                    }
                    break;

                case HideoutAreas.BITCOIN_FARM:
                    for (const slot of area.slots)
                    {
                        if (slot.item)
                        {
                            btcFarmCGs++;
                        }
                    }
                    break;
            }
        }

        // update production time
        for (const prod in pmcData.Hideout.Production)
        {
            const scavCaseRecipe =
                DatabaseServer.getTables().hideout.scavcase.find(
                    r => r._id === prod
                );
            if (!pmcData.Hideout.Production[prod].inProgress)
            {
                continue;
            }

            if (scavCaseRecipe)
            {
                const timeElapsed =
                    TimeUtil.getTimestamp() -
                    pmcData.Hideout.Production[prod].StartTimestamp -
                    pmcData.Hideout.Production[prod].Progress;
                pmcData.Hideout.Production[prod].Progress += timeElapsed;
                continue;
            }

            if (prod === HideoutHelper.waterCollector)
            {
                let timeElapsed =
                    TimeUtil.getTimestamp() -
                    pmcData.Hideout.Production[prod].StartTimestamp -
                    pmcData.Hideout.Production[prod].Progress;
                if (!isGeneratorOn)
                {
                    timeElapsed = Math.floor(timeElapsed * 0.2);
                }

                if (waterCollectorHasFilter)
                {
                    pmcData.Hideout.Production[prod].Progress += timeElapsed;
                }
                continue;
            }

            if (prod === HideoutHelper.bitcoinFarm)
            {
                pmcData.Hideout.Production[prod] =
                    HideoutHelper.updateBitcoinFarm(
                        pmcData,
                        btcFarmCGs,
                        isGeneratorOn
                    );
                continue;
            }

            //other recipes
            const recipe = recipes.find(r => r._id === prod);
            if (!recipe)
            {
                Logger.error(`Could not find recipe ${prod} for area type`);
                continue;
            }

            let timeElapsed =
                TimeUtil.getTimestamp() -
                pmcData.Hideout.Production[prod].StartTimestamp -
                pmcData.Hideout.Production[prod].Progress;
            if (recipe.continuous && !isGeneratorOn)
            {
                timeElapsed = Math.floor(
                    timeElapsed * HideoutConfig.generatorSpeedWithoutFuel
                );
            }
            pmcData.Hideout.Production[prod].Progress += timeElapsed;
        }
    }

    static updateWaterCollector(sessionId, pmcData, area, isGeneratorOn)
    {
        if (area.level === 3)
        {
            const prod =
                pmcData.Hideout.Production[HideoutHelper.waterCollector];
            if (prod && HideoutHelper.isProduction(prod))
            {
                area = HideoutHelper.updateWaterFilters(
                    area,
                    prod,
                    isGeneratorOn,
                    pmcData
                );
            }
            else
            {
                // continuousProductionStart()
                // seem to not trigger consistently
                const recipe = {
                    recipeId: HideoutHelper.waterCollector,
                    Action: "HideoutSingleProductionStart",
                    items: [],
                    timestamp: TimeUtil.getTimestamp(),
                };

                HideoutHelper.registerProduction(pmcData, recipe, sessionId);
            }
        }
    }

    static doesWaterCollectorHaveFilter(waterCollector)
    {
        if (waterCollector.level === 3)
        {
            // can put filtersd in from L3
            // Has filter in at least one slot
            return waterCollector.slots.some(x => x.item);
        }

        // No Filter
        return false;
    }

    static updateFuel(generatorArea, pmcData)
    {
        // 1 resource last 14 min 27 sec, 1/14.45/60 = 0.00115
        // 10-10-2021 From wiki, 1 resource last 12 minutes 38 seconds, 1/12.63333/60 = 0.00131
        let fuelDrainRate =
            HideoutConfig.generatorFuelFlowRate *
            HideoutConfig.runIntervalSeconds;
        // implemented moddable bonus for fuel consumption bonus instead of using solar power variable as before
        const fuelBonus = pmcData.Bonuses.find(
            b => b.type === "FuelConsumption"
        );
        const fuelBonusPercent =
            1.0 - (fuelBonus ? Math.abs(fuelBonus.value) : 0) / 100;
        fuelDrainRate *= fuelBonusPercent;
        // Hideout management resource consumption bonus:
        const hideoutManagementConsumptionBonus =
            1.0 - HideoutHelper.getHideoutManagementConsumptionBonus(pmcData);
        fuelDrainRate *= hideoutManagementConsumptionBonus;
        let hasAnyFuelRemaining = false;
        let pointsConsumed = 0;

        for (let i = 0; i < generatorArea.slots.length; i++)
        {
            if (!generatorArea.slots[i].item)
            {
                continue;
            }
            else
            {
                let resourceValue =
                    generatorArea.slots[i].item[0].upd &&
                    generatorArea.slots[i].item[0].upd.Resource
                        ? generatorArea.slots[i].item[0].upd.Resource.Value
                        : null;
                if (resourceValue === 0)
                {
                    continue;
                }
                else if (!resourceValue)
                {
                    const fuelItem = HideoutHelper.expeditionaryFuelTank;
                    resourceValue =
                        generatorArea.slots[i].item[0]._tpl === fuelItem
                            ? (resourceValue = 60 - fuelDrainRate)
                            : (resourceValue = 100 - fuelDrainRate);
                    pointsConsumed = fuelDrainRate;
                }
                else
                {
                    pointsConsumed =
                        (generatorArea.slots[i].item[0].upd.Resource
                            .UnitsConsumed || 0) + fuelDrainRate;
                    resourceValue -= fuelDrainRate;
                }

                resourceValue = Math.round(resourceValue * 10000) / 10000;
                pointsConsumed = Math.round(pointsConsumed * 10000) / 10000;

                //check unit consumed for increment skill point
                if (pmcData && Math.floor(pointsConsumed / 10) >= 1)
                {
                    PlayerService.incrementSkillLevel(
                        pmcData,
                        null,
                        SkillTypes.HIDEOUT_MANAGEMENT,
                        1
                    );
                    pointsConsumed -= 10;
                }

                if (resourceValue > 0)
                {
                    generatorArea.slots[i].item[0].upd =
                        HideoutHelper.getAreaUpdObject(
                            1,
                            resourceValue,
                            pointsConsumed
                        );

                    Logger.debug(
                        `Generator: ${resourceValue} fuel left on tank slot ${
                            i + 1
                        }`
                    );
                    hasAnyFuelRemaining = true;
                    break; // Break here to avoid updating all the fuel tanks
                }
                else
                {
                    generatorArea.slots[i].item[0].upd =
                        HideoutHelper.getAreaUpdObject(1, 0, 0);

                    // Update remaining resources to be subtracted
                    fuelDrainRate = Math.abs(resourceValue);
                }
            }
        }

        if (!hasAnyFuelRemaining)
        {
            generatorArea.active = false;
        }

        return generatorArea;
    }

    /**
     *
     * Filters are deleted when reaching 0 resourceValue
     * @param waterFilterArea
     * @param pwProd
     * @param isGeneratorOn
     * @param pmcData
     * @returns
     */
    static updateWaterFilters(waterFilterArea, pwProd, isGeneratorOn, pmcData)
    {
        let timeElapsed =
            TimeUtil.getTimestamp() - pwProd.StartTimestamp - pwProd.Progress;
        // 100 resources last 8 hrs 20 min, 100/8.33/60/60 = 0.00333
        let filterDrainRate = 0.00333;
        // Hideout management resource consumption bonus:
        const hideoutManagementConsumptionBonus =
            1.0 - HideoutHelper.getHideoutManagementConsumptionBonus(pmcData);
        filterDrainRate *= hideoutManagementConsumptionBonus;
        let productionTime = 0;
        let pointsConsumed = 0;

        const recipe = DatabaseServer.getTables().hideout.production.find(
            prod => prod._id === HideoutHelper.waterCollector
        );
        productionTime = recipe.productionTime || 0;

        if (!isGeneratorOn)
        {
            timeElapsed = Math.floor(timeElapsed * 0.2);
        }
        filterDrainRate =
            timeElapsed > productionTime
                ? (filterDrainRate *= productionTime - pwProd.Progress)
                : (filterDrainRate *= timeElapsed);

        if (pwProd.Progress < productionTime)
        {
            for (let i = 0; i < waterFilterArea.slots.length; i++)
            {
                if (!waterFilterArea.slots[i].item)
                {
                    continue;
                }
                else
                {
                    let resourceValue =
                        waterFilterArea.slots[i].item[0].upd &&
                        waterFilterArea.slots[i].item[0].upd.Resource
                            ? waterFilterArea.slots[i].item[0].upd.Resource
                                .Value
                            : null;
                    if (!resourceValue)
                    {
                        resourceValue = 100 - filterDrainRate;
                        pointsConsumed = filterDrainRate;
                    }
                    else
                    {
                        pointsConsumed =
                            (waterFilterArea.slots[i].item[0].upd.Resource
                                .UnitsConsumed || 0) + filterDrainRate;
                        resourceValue -= filterDrainRate;
                    }
                    resourceValue = Math.round(resourceValue * 10000) / 10000;
                    pointsConsumed = Math.round(pointsConsumed * 10000) / 10000;

                    //check unit consumed for increment skill point
                    if (pmcData && Math.floor(pointsConsumed / 10) >= 1)
                    {
                        PlayerService.incrementSkillLevel(
                            pmcData,
                            null,
                            SkillTypes.HIDEOUT_MANAGEMENT,
                            1
                        );
                        pointsConsumed -= 10;
                    }

                    if (resourceValue > 0)
                    {
                        waterFilterArea.slots[i].item[0].upd =
                            HideoutHelper.getAreaUpdObject(
                                1,
                                resourceValue,
                                pointsConsumed
                            );
                        Logger.debug(
                            `Water filter: ${resourceValue} filter left on slot ${
                                i + 1
                            }`
                        );
                        break; // Break here to avoid updating all filters
                    }
                    else
                    {
                        delete waterFilterArea.slots[i].item;
                        // Update remaining resources to be subtracted
                        filterDrainRate = Math.abs(resourceValue);
                    }
                }
            }
        }

        return waterFilterArea;
    }

    static getAreaUpdObject(stackCount, resourceValue, resourceUnitsConsumed)
    {
        return {
            StackObjectsCount: stackCount,
            Resource: {
                Value: resourceValue,
                UnitsConsumed: resourceUnitsConsumed,
            },
        };
    }

    static updateAirFilters(airFilterArea, pmcData)
    {
        // 300 resources last 20 hrs, 300/20/60/60 = 0.00416
        /* 10-10-2021 from WIKI (https://escapefromtarkov.fandom.com/wiki/FP-100_filter_absorber)
            Lasts for 17 hours 38 minutes and 49 seconds (23 hours 31 minutes and 45 seconds with elite hideout management skill),
            300/17.64694/60/60 = 0.004722
        */
        let filterDrainRate =
            HideoutConfig.airFilterUnitFlowRate *
            HideoutConfig.runIntervalSeconds;
        // Hideout management resource consumption bonus:
        const hideoutManagementConsumptionBonus =
            1.0 - HideoutHelper.getHideoutManagementConsumptionBonus(pmcData);
        filterDrainRate *= hideoutManagementConsumptionBonus;
        let pointsConsumed = 0;

        for (let i = 0; i < airFilterArea.slots.length; i++)
        {
            if (!airFilterArea.slots[i].item)
            {
                continue;
            }
            else
            {
                let resourceValue =
                    airFilterArea.slots[i].item[0].upd &&
                    airFilterArea.slots[i].item[0].upd.Resource
                        ? airFilterArea.slots[i].item[0].upd.Resource.Value
                        : null;
                if (!resourceValue)
                {
                    resourceValue = 300 - filterDrainRate;
                    pointsConsumed = filterDrainRate;
                }
                else
                {
                    pointsConsumed =
                        (airFilterArea.slots[i].item[0].upd.Resource
                            .UnitsConsumed || 0) + filterDrainRate;
                    resourceValue -= filterDrainRate;
                }
                resourceValue = Math.round(resourceValue * 10000) / 10000;
                pointsConsumed = Math.round(pointsConsumed * 10000) / 10000;

                //check unit consumed for increment skill point
                if (pmcData && Math.floor(pointsConsumed / 10) >= 1)
                {
                    PlayerService.incrementSkillLevel(
                        pmcData,
                        null,
                        SkillTypes.HIDEOUT_MANAGEMENT,
                        1
                    );
                    pointsConsumed -= 10;
                }

                if (resourceValue > 0)
                {
                    airFilterArea.slots[i].item[0].upd = {
                        StackObjectsCount: 1,
                        Resource: {
                            Value: resourceValue,
                            UnitsConsumed: pointsConsumed,
                        },
                    };
                    Logger.debug(
                        `Air filter: ${resourceValue} filter left on slot ${
                            i + 1
                        }`
                    );
                    break; // Break here to avoid updating all filters
                }
                else
                {
                    delete airFilterArea.slots[i].item;
                    // Update remaining resources to be subtracted
                    filterDrainRate = Math.abs(resourceValue);
                }
            }
        }

        return airFilterArea;
    }

    static updateBitcoinFarm(pmcData, btcFarmCGs, isGeneratorOn)
    {
        const btcProd = pmcData.Hideout.Production[HideoutHelper.bitcoinFarm];
        const bitcoinProdData =
            DatabaseServer.getTables().hideout.production.find(
                p => p._id === "5d5c205bd582a50d042a3c0e"
            );
        const hideoutSlots = HideoutHelper.getBTCSlots(pmcData) || 3;
        if (
            HideoutHelper.isProduction(btcProd) &&
            btcProd.Products.length >= hideoutSlots
        )
        {
            btcProd.Progress = 0;
            return btcProd;
        }

        // this should never happen
        if (HideoutHelper.isProduction(btcProd))
        {
            const timeElapsedSeconds =
                TimeUtil.getTimestamp() - btcProd.StartTimestamp;

            if (isGeneratorOn)
            {
                btcProd.Progress += timeElapsedSeconds;
            }

            // The wiki has a wrong formula!
            // Do not change unless you validate it with the Client code files!
            // This formula was found on the client files:
            // *******************************************************
            /*
                static override int InstalledSuppliesCount
	            {
		            get
		            {
			            return HideoutHelper.int_1;
		            }
		            static set
		            {
			            if (HideoutHelper.int_1 == value)
                        {
                            return;
                        }
                        HideoutHelper.int_1 = value;
                        base.Single_0 = ((HideoutHelper.int_1 == 0) ? 0f : (1f + (float)(HideoutHelper.int_1 - 1) * HideoutHelper.float_4));
                    }
                }
            */
            // **********************************************************
            // At the time of writing this comment, this was GClass1667
            // To find it in case of weird results, use DNSpy and look for usages on class AreaData
            // Look for a GClassXXXX that has a method called "InitDetails" and the only parameter is the AreaData
            // That should be the bitcoin farm production. To validate, try to find the snippet below:
            /*
                static override void InitDetails(AreaData data)
                {
                    base.InitDetails(data);
                    HideoutHelper.gclass1678_1.Type = EDetailsType.Farming;
                }
            */
            const finalProductionTimeSeconds =
                bitcoinProdData.productionTime /
                (1 + (btcFarmCGs - 1) * HideoutConfig.gpuBoostRate);

            while (btcProd.Progress > finalProductionTimeSeconds)
            {
                if (btcProd.Products.length < hideoutSlots)
                {
                    btcProd.Products.push({
                        _id: HashUtil.generate(),
                        _tpl: "59faff1d86f7746c51718c9c",
                        upd: {
                            StackObjectsCount: 1,
                        },
                    });
                    btcProd.Progress -= finalProductionTimeSeconds;
                }
                else
                {
                    btcProd.Progress = 0;
                }
            }

            btcProd.StartTimestamp = TimeUtil.getTimestamp();
            return btcProd;
        }
        else
        {
            return null;
        }
    }

    static getBTCSlots(pmcData)
    {
        const bitcoinProduction =
            DatabaseServer.getTables().hideout.production.find(
                p => p._id === HideoutHelper.bitcoinFarm
            );
        const productionSlots = bitcoinProduction?.productionLimitCount || 3;
        const hasManagementSkillSlots =
            HideoutHelper.hasManagementSkillSlots(pmcData);
        const managementSlots = HideoutHelper.getManagementSkillsSlots() || 2;
        return (
            productionSlots + (hasManagementSkillSlots ? managementSlots : 0)
        );
    }

    static getManagementSkillsSlots()
    {
        return DatabaseServer.getTables().globals.config.SkillsSettings
            .HideoutManagement.EliteSlots.BitcoinFarm.Container;
    }

    static hasManagementSkillSlots(pmcData)
    {
        return (
            HideoutHelper.getHideoutManagementSkill(pmcData)?.Progress >= 5100
        );
    }

    static getHideoutManagementSkill(pmcData)
    {
        for (const skill of pmcData.Skills.Common)
        {
            if (skill.Id === "HideoutManagement")
            {
                return skill;
            }
        }
        return null;
    }

    static getHideoutManagementConsumptionBonus(pmcData)
    {
        const hideoutManagementSkill =
            HideoutHelper.getHideoutManagementSkill(pmcData);
        if (!hideoutManagementSkill)
        {
            return 0;
        }
        let roundedLevel = Math.floor(hideoutManagementSkill.Progress / 100);
        // If the level is 51 we need to round it at 50 so on elite you dont get 25.5%
        // at level 1 you already get 0.5%, so it goes up until level 50. For some reason the wiki
        // says that it caps at level 51 with 25% but as per dump data that is incorrect aparently
        roundedLevel = roundedLevel === 51 ? roundedLevel - 1 : roundedLevel;
        return (
            (roundedLevel *
                DatabaseServer.getTables().globals.config.SkillsSettings
                    .HideoutManagement.ConsumptionReductionPerLevel) /
            100
        );
    }

    static isProduction(productive)
    {
        return (
            productive.Progress !== undefined ||
            productive.RecipeId !== undefined
        );
    }

    static getBTC(pmcData, body, sessionID)
    {
        const output = ItemEventRouter.getOutput(sessionID);

        const bitCoinCount =
            pmcData.Hideout.Production[HideoutHelper.bitcoinFarm].Products
                .length;
        if (!bitCoinCount)
        {
            Logger.error("No bitcoins are ready for pickup!");
            return HttpResponseUtil.appendErrorToOutput(output);
        }

        const newBTC = {
            items: [
                {
                    item_id: HideoutHelper.bitcoin,
                    count: pmcData.Hideout.Production[HideoutHelper.bitcoinFarm]
                        .Products.length,
                },
            ],
            tid: "ragfair",
        };

        const slots = HideoutHelper.getBTCSlots(pmcData);
        const callback = () =>
        {
            if (
                pmcData.Hideout.Production[HideoutHelper.bitcoinFarm].Products
                    .length >= slots
            )
            {
                pmcData.Hideout.Production[
                    HideoutHelper.bitcoinFarm
                ].StartTimestamp = TimeUtil.getTimestamp();
            }
            pmcData.Hideout.Production[HideoutHelper.bitcoinFarm].Products = [];
        };

        return InventoryHelper.addItem(
            pmcData,
            newBTC,
            output,
            sessionID,
            callback,
            true
        );
    }
}

module.exports = HideoutHelper;

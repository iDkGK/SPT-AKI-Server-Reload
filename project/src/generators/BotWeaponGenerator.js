"use strict";

require("../Lib.js");

class BotWeaponGenerator
{
    static get modMagazineSlotId()
    {
        return "mod_magazine";
    }

    /**
     * Get a random weapon from a bots pool of weapons (weighted)
     * @param equipmentSlot Primary/secondary/holster
     * @param botTemplateInventory e.g. assault.json
     * @returns weapon tpl
     */
    static pickWeightedWeaponTplFromPool(equipmentSlot, botTemplateInventory)
    {
        const weaponPool = botTemplateInventory.equipment[equipmentSlot];
        return WeightedRandomHelper.getWeightedInventoryItem(weaponPool);
    }

    /**
     * Generated a weapon based on the supplied weapon tpl
     * @param weaponTpl weapon tpl to generate (use pickWeightedWeaponTplFromPool())
     * @param equipmentSlot slot to fit into, primary/secondary/holster
     * @param botTemplateInventory e.g. assault.json
     * @param weaponParentId
     * @param modChances
     * @param botRole
     * @param isPmc
     * @returns GenerateWeaponResult object
     */
    static generateWeaponByTpl(
        weaponTpl,
        equipmentSlot,
        botTemplateInventory,
        weaponParentId,
        modChances,
        botRole,
        isPmc
    )
    {
        const modPool = botTemplateInventory.mods;

        const weaponItemTemplate = ItemHelper.getItem(weaponTpl)[1];

        if (!weaponItemTemplate)
        {
            Logger.error(`Could not find item template with tpl ${weaponTpl}`);
            Logger.error(`WeaponSlot -> ${equipmentSlot}`);
            return;
        }

        let weaponArray = BotWeaponGenerator.constructWeaponBaseArray(
            weaponTpl,
            weaponParentId,
            equipmentSlot,
            weaponItemTemplate,
            botRole
        );

        // Add mods to weapon base
        if (Object.keys(modPool).includes(weaponTpl))
        {
            weaponArray = BotGeneratorHelper.generateModsForItem(
                weaponArray,
                modPool,
                weaponArray[0]._id,
                weaponItemTemplate,
                modChances
            );
        }

        if (!BotWeaponGenerator.isWeaponValid(weaponArray))
        {
            // Something goofed, fallback to the weapons preset
            weaponArray = BotWeaponGenerator.getPresetWeaponMods(
                weaponTpl,
                equipmentSlot,
                weaponParentId,
                weaponItemTemplate,
                botRole
            );
        }

        // Find ammo to use when filling magazines
        if (!botTemplateInventory.Ammo)
        {
            Logger.error(`No ammo found for bot type ${botRole}`);
            throw new Error("bot generation failed");
        }

        // Fill existing magazines to full and sync ammo type
        const ammoTpl = BotWeaponGenerator.getCompatibleAmmo(
            botTemplateInventory.Ammo,
            weaponItemTemplate,
            isPmc
        );
        for (const magazine of weaponArray.filter(
            x => x.slotId === BotWeaponGenerator.modMagazineSlotId
        ))
        {
            BotWeaponGenerator.fillExistingMagazines(
                weaponArray,
                magazine,
                ammoTpl
            );
        }

        return {
            weapon: weaponArray,
            chosenAmmo: ammoTpl,
            weaponMods: modPool,
            weaponTemplate: weaponItemTemplate,
        };
    }

    /**
     * Generate an entirely random weapon
     * @param equipmentSlot Primary/secondary/holster
     * @param botTemplateInventory e.g. assault.json
     * @param weaponParentId
     * @param modChances
     * @param botRole
     * @param isPmc
     * @returns GenerateWeaponResult object
     */
    static generateRandomWeapon(
        equipmentSlot,
        botTemplateInventory,
        weaponParentId,
        modChances,
        botRole,
        isPmc
    )
    {
        const weaponTpl = BotWeaponGenerator.pickWeightedWeaponTplFromPool(
            equipmentSlot,
            botTemplateInventory
        );
        return BotWeaponGenerator.generateWeaponByTpl(
            weaponTpl,
            equipmentSlot,
            botTemplateInventory,
            weaponParentId,
            modChances,
            botRole,
            isPmc
        );
    }

    /**
     * Create array with weapon base as only element
     * Add additional properties as required
     * @param weaponTpl
     * @param weaponParentId
     * @param equipmentSlot
     * @param weaponItemTemplate
     * @param botRole for durability values
     * @returns
     */
    static constructWeaponBaseArray(
        weaponTpl,
        weaponParentId,
        equipmentSlot,
        weaponItemTemplate,
        botRole
    )
    {
        return [
            {
                _id: HashUtil.generate(),
                _tpl: weaponTpl,
                parentId: weaponParentId,
                slotId: equipmentSlot,
                ...BotGeneratorHelper.generateExtraPropertiesForItem(
                    weaponItemTemplate,
                    botRole
                ),
            },
        ];
    }

    /**
     * Add compatible magazines to an inventory based on a generated weapon
     * @param weaponDetails
     * @param magCounts
     * @param inventory
     * @param botRole the bot type we're getting generating extra mags for
     */
    static addExtraMagazinesToInventory(
        weaponDetails,
        magCounts,
        inventory,
        botRole
    )
    {
        // Generate extra magazines and attempt add them to TacticalVest or Pockets
        BotWeaponGenerator.generateExtraMagazines(
            weaponDetails.weapon,
            weaponDetails.weaponTemplate,
            magCounts,
            weaponDetails.chosenAmmo,
            inventory,
            botRole
        );
    }

    /**
     * Get the mods necessary to kit out a weapon to its preset level
     * @param weaponTpl weapon to find preset for
     * @param equipmentSlot the slot the weapon will be placed in
     * @param weaponParentId Value used for the parentid
     * @returns array of weapon mods
     */
    static getPresetWeaponMods(
        weaponTpl,
        equipmentSlot,
        weaponParentId,
        itemTemplate,
        botRole
    )
    {
        // Invalid weapon generated, fallback to preset
        Logger.warning(
            `Weapon ${weaponTpl} was generated incorrectly, falling back to weapon preset see error above`
        );
        const weaponMods = [];

        // TODO: Right now, preset weapons trigger a lot of warnings regarding missing ammo in magazines & such
        let preset;
        for (const presetObj of Object.values(
            DatabaseServer.getTables().globals.ItemPresets
        ))
        {
            if (presetObj._items[0]._tpl === weaponTpl)
            {
                preset = JsonUtil.clone(presetObj);
                break;
            }
        }

        if (preset)
        {
            const parentItem = preset._items[0];
            preset._items[0] = {
                ...parentItem,
                ...{
                    parentId: weaponParentId,
                    slotId: equipmentSlot,
                    ...BotGeneratorHelper.generateExtraPropertiesForItem(
                        itemTemplate,
                        botRole
                    ),
                },
            };
            weaponMods.push(...preset._items);
        }
        else
        {
            throw new Error(
                `Could not find preset for weapon with tpl ${weaponTpl}`
            );
        }

        return weaponMods;
    }

    /** Checks if all required slots are occupied on a weapon and all it's mods */
    static isWeaponValid(weaponItemArray)
    {
        for (const weaponMod of weaponItemArray)
        {
            const template = ItemHelper.getItem(weaponMod._tpl)[1];
            if (!template._props.Slots || !template._props.Slots.length)
            {
                continue;
            }

            for (const slot of template._props.Slots)
            {
                if (!slot._required)
                {
                    continue;
                }

                const slotItem = weaponItemArray.find(
                    i => i.parentId === weaponMod._id && i.slotId === slot._name
                );
                if (!slotItem)
                {
                    Logger.error(
                        `Required slot '${slot._name}' on ${template._id} was empty`
                    );
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Generates extra magazines or bullets (if magazine is internal) and adds them to TacticalVest and Pockets.
     * Additionally, adds extra bullets to SecuredContainer
     * @param weaponMods
     * @param weaponTemplate
     * @param magCounts
     * @param ammoTpl
     * @param inventory
     * @param botRole the bot type we're getting generating extra mags for
     * @returns
     */
    static generateExtraMagazines(
        weaponMods,
        weaponTemplate,
        magCounts,
        ammoTpl,
        inventory,
        botRole
    )
    {
        let magazineTpl = BotWeaponGenerator.getMagazineTplFromWeaponTemplate(
            weaponMods,
            weaponTemplate,
            botRole
        );
        let magTemplate = ItemHelper.getItem(magazineTpl)[1];
        if (!magTemplate)
        {
            Logger.error(
                `Could not find magazine template with tpl ${magazineTpl}`
            );
            return;
        }
        const randomisedMagazineCount =
            BotWeaponGenerator.getRandomisedMagazineCount(magCounts);

        if (magTemplate._props.ReloadMagType === "InternalMagazine")
        {
            // e.g. chippa rhina / МР-153
            const bulletCount = BotWeaponGenerator.getRandomisedBulletCount(
                magCounts,
                magTemplate
            );
            BotWeaponGenerator.addBulletsToVestAndPockets(
                ammoTpl,
                bulletCount,
                inventory
            );
        }
        else if (weaponTemplate._props.ReloadMode === "OnlyBarrel")
        {
            // e.g. mp18, flare gun, Grenade launcher
            const bulletCount = randomisedMagazineCount;
            BotWeaponGenerator.addBulletsToVestAndPockets(
                ammoTpl,
                bulletCount,
                inventory
            );
        } // ReloadMode == "ExternalMagazine" - most guns
        else
        {
            for (let i = 0; i < randomisedMagazineCount; i++)
            {
                const magazineId = HashUtil.generate();
                const magazineWithAmmo = [
                    {
                        _id: magazineId,
                        _tpl: magazineTpl,
                    },
                    {
                        _id: HashUtil.generate(),
                        _tpl: ammoTpl,
                        parentId: magazineId,
                        slotId: "cartridges",
                        upd: {
                            StackObjectsCount:
                                magTemplate._props.Cartridges[0]._max_count,
                        },
                    },
                ];

                const ableToFitMagazinesIntoBotInventory =
                    BotGeneratorHelper.addItemWithChildrenToEquipmentSlot(
                        [EquipmentSlots.TACTICAL_VEST, EquipmentSlots.POCKETS],
                        magazineId,
                        magazineTpl,
                        magazineWithAmmo,
                        inventory
                    );

                if (!ableToFitMagazinesIntoBotInventory && i < magCounts.min)
                {
                    /* We were unable to fit at least the minimum amount of magazines,
                     * so we fallback to default magazine and try again.
                     * Temporary workaround to Killa spawning with no extras if he spawns with a drum mag */

                    if (
                        magazineTpl ===
                        BotWeaponGenerator.getWeaponsDefaultMagazineTpl(
                            weaponTemplate
                        )
                    )
                    {
                        // We were already on default - stop here to prevent infinite looping
                        break;
                    }

                    // Get default magazine tpl, reset loop counter by 1 and try again
                    magazineTpl =
                        BotWeaponGenerator.getWeaponsDefaultMagazineTpl(
                            weaponTemplate
                        );
                    magTemplate = ItemHelper.getItem(magazineTpl)[1];
                    if (!magTemplate)
                    {
                        Logger.error(
                            `Could not find magazine template with tpl ${magazineTpl}`
                        );
                        break;
                    }

                    if (
                        magTemplate._props.ReloadMagType === "InternalMagazine"
                    )
                    {
                        break;
                    }

                    i--;
                }
            }
        }

        const ammoTemplate = ItemHelper.getItem(ammoTpl)[1];
        if (!ammoTemplate)
        {
            Logger.error(`Could not find ammo template with tpl ${ammoTpl}`);
            return;
        }

        // Add x stacks of bullets to SecuredContainer (bots use a magic mag packing skill to reload instantly)
        BotWeaponGenerator.addAmmoToSecureContainer(
            BotConfig.secureContainerAmmoStackCount,
            ammoTpl,
            ammoTemplate._props.StackMaxSize,
            inventory
        );
    }

    /**
     * Get a randomised number of bullets for a specific magazine
     * @param magCounts min and max count of magazines
     * @param magTemplate magazine to generate bullet count for
     * @returns bullet count number
     */
    static getRandomisedBulletCount(magCounts, magTemplate)
    {
        const randomisedMagazineCount =
            BotWeaponGenerator.getRandomisedMagazineCount(magCounts);
        const parentItem = ItemHelper.getItem(magTemplate._parent)[1];
        let chamberBulletCount = 0;
        if (BotGeneratorHelper.magazineIsCylinderRelated(parentItem._name))
        {
            // if we have a CylinderMagazine/SpringDrivenCylinder we count the number of camoras as the _max_count of the magazine is 0
            chamberBulletCount = magTemplate._props.Slots.length;
        }
        else
        {
            chamberBulletCount = magTemplate._props.Cartridges[0]._max_count;
        }

        /* Get the amount of bullets that would fit in the internal magazine
         * and multiply by how many magazines were supposed to be created */
        return chamberBulletCount * randomisedMagazineCount;
    }

    /**
     * Get a randomised count of magazines
     * @param magCounts min and max value returned value can be between
     * @returns numberical value of magazine count
     */
    static getRandomisedMagazineCount(magCounts)
    {
        const range = magCounts.max - magCounts.min;
        return RandomUtil.getBiasedRandomNumber(
            magCounts.min,
            magCounts.max,
            Math.round(range * 0.75),
            4
        );
    }

    /**
     * Add ammo to the secure container
     * @param stackCount How many stacks of ammo to add
     * @param ammoTpl Ammo type to add
     * @param stackSize Size of the ammo stack to add
     * @param inventory Player inventory
     */
    static addAmmoToSecureContainer(stackCount, ammoTpl, stackSize, inventory)
    {
        for (let i = 0; i < stackCount; i++)
        {
            const id = HashUtil.generate();
            BotGeneratorHelper.addItemWithChildrenToEquipmentSlot(
                [EquipmentSlots.SECURED_CONTAINER],
                id,
                ammoTpl,
                [
                    {
                        _id: id,
                        _tpl: ammoTpl,
                        upd: { StackObjectsCount: stackSize },
                    },
                ],
                inventory
            );
        }
    }

    /**
     * Get a weapons magazine tpl from a weapon template
     * @param weaponMods mods from a weapon template
     * @param weaponTemplate Weapon to get magazine tpl for
     * @param botRole the bot type we are getting the magazine for
     * @returns magazine tpl string
     */
    static getMagazineTplFromWeaponTemplate(
        weaponMods,
        weaponTemplate,
        botRole
    )
    {
        const magazine = weaponMods.find(
            m => m.slotId === BotWeaponGenerator.modMagazineSlotId
        );
        if (!magazine)
        {
            // log error if no magazine AND not a chamber loaded weapon (e.g. shotgun revolver)
            if (!weaponTemplate._props.isChamberLoad)
            {
                Logger.warning(
                    `Weapon with tpl ${weaponTemplate._id} has no magazine or chamber`
                );
            }

            const defaultMagTplId =
                BotWeaponGenerator.getWeaponsDefaultMagazineTpl(weaponTemplate);
            Logger.debug(
                `[${botRole}] Unable to find magazine for weapon ${weaponTemplate._id} ${weaponTemplate._name}, using mag template default ${defaultMagTplId}.`
            );

            return defaultMagTplId;
        }

        return magazine._tpl;
    }

    /**
     * Get a weapons default magazine template id
     * @param weaponTemplate weapon to get default magazine for
     * @returns tpl of magazine
     */
    static getWeaponsDefaultMagazineTpl(weaponTemplate)
    {
        return weaponTemplate._props.defMagType;
    }

    static addBulletsToVestAndPockets(ammoTpl, bulletCount, inventory)
    {
        const ammoItems = ItemHelper.splitStack({
            _id: HashUtil.generate(),
            _tpl: ammoTpl,
            upd: { StackObjectsCount: bulletCount },
        });

        for (const ammoItem of ammoItems)
        {
            BotGeneratorHelper.addItemWithChildrenToEquipmentSlot(
                [EquipmentSlots.TACTICAL_VEST, EquipmentSlots.POCKETS],
                ammoItem._id,
                ammoItem._tpl,
                [ammoItem],
                inventory
            );
        }
    }

    /**
     * Finds and return a compatible ammo tpl based on the bots ammo weightings (x.json/inventory/equipment/ammo)
     * @param ammo a list of ammo tpls the weapon can use
     * @param weaponTemplate the weapon we want to pick ammo for
     * @param isPmc is the ammo being gathered for a pmc (runs pmc ammo filtering)
     * @returns an ammo tpl that works with the desired gun
     */
    static getCompatibleAmmo(ammo, weaponTemplate, isPmc)
    {
        const desiredCaliber =
            BotWeaponGenerator.getWeaponCaliber(weaponTemplate);

        let compatibleCartridges = ammo[desiredCaliber];
        if (!compatibleCartridges || compatibleCartridges?.length === 0)
        {
            Logger.warning(
                `No caliber data for ${weaponTemplate._id} - ${weaponTemplate._name}, falling back to default -> ${weaponTemplate._props.defAmmo}`
            );
            // Immediatelly returns, as default ammo is guaranteed to be compatible
            return weaponTemplate._props.defAmmo;
        }

        // Filter blacklisted cartridges for pmcs
        if (isPmc)
        {
            const filteredCartridges = {};
            const cartridgeTpls = Object.keys(compatibleCartridges).map(x => x);

            // Create new dict of allowed cartridges
            for (const cartridgeTpl of cartridgeTpls)
            {
                filteredCartridges[cartridgeTpl] =
                    compatibleCartridges[cartridgeTpl];
            }

            if (Object.keys(filteredCartridges).length === 0)
            {
                Logger.warning(
                    `pmc filtered out all ammo for ${desiredCaliber}, reverting to non-filtered ammo`
                );
            }
            else
            {
                compatibleCartridges = JsonUtil.clone(filteredCartridges);
            }
        }

        const chosenAmmoTpl =
            WeightedRandomHelper.getWeightedInventoryItem(compatibleCartridges);
        if (
            weaponTemplate._props.Chambers[0] &&
            !weaponTemplate._props.Chambers[0]._props.filters[0].Filter.includes(
                chosenAmmoTpl
            )
        )
        {
            Logger.warning(
                `Incompatible ammo ${chosenAmmoTpl} was found for ${weaponTemplate._id} - ${weaponTemplate._name}, falling back to default -> ${weaponTemplate._props.defAmmo}`
            );
            // Incompatible ammo found, return default (can happen with .366 and 7.62x39 weapons)
            return weaponTemplate._props.defAmmo;
        }

        return chosenAmmoTpl;
    }

    /**
     * Get a weapons compatible cartridge caliber
     * @param weaponTemplate Weapon to look up caliber of
     * @returns caliber as string
     */
    static getWeaponCaliber(weaponTemplate)
    {
        if (weaponTemplate._props.Caliber)
        {
            return weaponTemplate._props.Caliber;
        }

        return weaponTemplate._props.ammoCaliber;
    }

    /**
     * Fill existing magazines to full, while replacing their contents with specified ammo
     * @param weaponMods
     * @param magazine
     * @param ammoTpl
     */
    static fillExistingMagazines(weaponMods, magazine, ammoTpl)
    {
        const modTemplate = ItemHelper.getItem(magazine._tpl)[1];
        if (!modTemplate)
        {
            Logger.error(
                `Could not find magazine template with tpl ${magazine._tpl}`
            );
            return;
        }

        const parentItem = ItemHelper.getItem(modTemplate._parent)[1];
        const fullStackSize = modTemplate._props.Cartridges[0]._max_count;

        // the revolver shotgun uses a magazine with chambers, not cartridges ("camora_xxx")
        // Exchange of the camora ammo is not necessary we could also just check for stackSize > 0 here
        // and remove the else
        if (BotGeneratorHelper.magazineIsCylinderRelated(parentItem._name))
        {
            BotWeaponGenerator.fillCamorasWithAmmo(
                weaponMods,
                magazine._id,
                ammoTpl
            );
        }
        else
        {
            BotWeaponGenerator.addOrUpdateMagazinesChildWithAmmo(
                weaponMods,
                magazine,
                ammoTpl,
                fullStackSize
            );
        }
    }

    /**
     * Add cartridge item to weapon Item array, if it already exists, update
     * @param weaponMods Weapon items array to amend
     * @param magazine magazine item details we're adding cartridges to
     * @param chosenAmmo cartridge to put into the magazine
     * @param newStackSize how many cartridges should go into the magazine
     */
    static addOrUpdateMagazinesChildWithAmmo(
        weaponMods,
        magazine,
        chosenAmmo,
        newStackSize
    )
    {
        const magazineCartridgeChildItem = weaponMods.find(
            m => m.parentId === magazine._id && m.slotId === "cartridges"
        );
        if (!magazineCartridgeChildItem)
        {
            // magazine doesn't have a child item with the ammo inside it, create one
            weaponMods.push({
                _id: HashUtil.generate(),
                _tpl: chosenAmmo,
                parentId: magazine._id,
                slotId: "cartridges",
                upd: { StackObjectsCount: newStackSize },
            });
        } // magazine has cartridge stack, amend details
        else
        {
            magazineCartridgeChildItem._tpl = chosenAmmo;
            magazineCartridgeChildItem.upd = {
                StackObjectsCount: newStackSize,
            };
        }
    }

    /**
     * Fill each Camora with a bullet
     * @param weaponMods Weapon mods to find and update camora mod(s) from
     * @param magazineId magazine id to find and add to
     * @param ammoTpl ammo template id to hydate with
     */
    static fillCamorasWithAmmo(weaponMods, magazineId, ammoTpl)
    {
        // for CylinderMagazine we exchange the ammo in the "camoras".
        // This might not be necessary since we already filled the camoras with a random whitelisted and compatible ammo type,
        // but I'm not sure whether this is also used elsewhere
        const camoras = weaponMods.filter(
            x => x.parentId === magazineId && x.slotId.startsWith("camora")
        );
        for (const camora of camoras)
        {
            camora._tpl = ammoTpl;
        }
    }
}

module.exports = BotWeaponGenerator;

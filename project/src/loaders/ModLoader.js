"use strict";

require("../Lib.js");
const semver = require("semver");

class ModLoader
{
    static basepath = "user/mods/";
    static imported = {};
    static onLoad = {};

    static load()
    {
        ModLoader.importMods();
        ModLoader.executeMods();
    }

    static getBundles(local)
    {
        throw new Error("Method not implemented.");
    }

    static getBundle(key, arg1)
    {
        throw new Error("Method not implemented.");
    }

    static importClass(name, filepath)
    {
        // import class
        const modpath = globalThis.G_RELEASE_CONFIGURATION
            ? `../${filepath}`
            : `../../${filepath}`;
        globalThis[name] = require(modpath);
    }

    static importMods()
    {
        // get mods
        if (!VFS.exists(ModLoader.basepath))
        {
            // no mods folder found
            VFS.createDir(ModLoader.basepath);
            return;
        }

        Logger.log("ModLoader: loading mods...");
        const mods = VFS.getDirs(ModLoader.basepath);

        // Used to check all errors before stopping the load execution
        let errorsFound = false;
        // validate mods
        for (const mod of mods)
        {
            if (!ModLoader.validMod(mod))
            {
                Logger.error("Invalid mod encountered");
                return;
            }
        }

        const loadedMods = {};
        for (const mod of mods)
        {
            loadedMods[mod] = JsonUtil.deserialize(
                VFS.readFile(`${ModLoader.getModPath(mod)}/package.json`)
            );
        }

        for (const modToValidate of Object.values(loadedMods))
        {
            // Returns if any mod dependency is not satisfied
            if (
                !ModLoader.areModDependenciesFulfilled(
                    modToValidate,
                    loadedMods
                )
            )
            {
                errorsFound = true;
            }

            // Returns if at least two incompatible mods are found
            if (!ModLoader.isModCompatible(modToValidate, loadedMods))
            {
                errorsFound = true;
            }

            // Returns if mod isnt compatible with this verison of aki
            if (!ModLoader.isModCombatibleWithAki(modToValidate))
            {
                errorsFound = true;
            }
        }

        if (errorsFound)
        {
            return;
        }

        // add mods
        for (const mod of mods)
        {
            ModLoader.addMod(mod);
        }
    }

    static isModCombatibleWithAki(mod)
    {
        const akiVersion = AkiConfig.akiVersion;
        const modName = `${mod.author}-${mod.name}`;

        // Error and prevent loading If no akiVersion property exists
        if (!mod.akiVersion)
        {
            Logger.error(
                `Mod ${modName} is missing the akiVersion field, most likely due to being out of date and incompatible with the current version of AKI`
            );
            return false;
        }

        // Error and prevent loading if akiVersion property is not a valid semver string
        if (
            !semver.valid(mod.akiVersion) &&
            !semver.validRange(mod.akiVersion)
        )
        {
            Logger.error(
                `Mod ${modName} contains an invalid semver string in the akiVersion field. Examples of valid values: https://github.com/npm/node-semver#versions`
            );
            return false;
        }

        // Warn and allow loading if semver is not satisfied
        if (!semver.satisfies(akiVersion, mod.akiVersion))
        {
            Logger.warning(
                `Mod ${modName} is not compatible with the current version of AKI. You may encounter issues - no support will be provided!`
            );
            return true;
        }

        return true;
    }

    static executeMods()
    {
        // sort mods load order
        let source = [];

        // if loadorder.json exists: load it, otherwise generate load order
        if (VFS.exists(`${ModLoader.basepath}loadorder.json`))
        {
            source = JsonUtil.deserialize(
                VFS.readFile(`${ModLoader.basepath}loadorder.json`)
            );
        }
        else
        {
            source = Object.keys(ModLoader.getLoadOrder(ModLoader.imported));
        }

        // import mod classes
        for (const mod of source)
        {
            if ("main" in ModLoader.imported[mod])
            {
                ModLoader.importClass(
                    mod,
                    `${ModLoader.getModPath(mod)}${
                        ModLoader.imported[mod].main
                    }`
                );
            }
        }

        // load mods
        for (const mod in ModLoader.onLoad)
        {
            ModLoader.onLoad[mod]();
        }

        // update the handbook lookup with modded items
        HandbookController.load();
    }

    static getModPath(mod)
    {
        return `${ModLoader.basepath}${mod}/`;
    }

    static addMod(mod)
    {
        const modpath = ModLoader.getModPath(mod);

        // add mod to imported list
        ModLoader.imported[mod] = JsonUtil.deserialize(
            VFS.readFile(`${modpath}/package.json`)
        );

        // add mod bundles
        if (VFS.exists(`${modpath}bundles.json`))
        {
            BundleLoader.addBundles(modpath);
        }
    }

    static areModDependenciesFulfilled(mod, loadedMods)
    {
        if (!mod.dependencies)
        {
            return true;
        }

        const modName = `${mod.author}-${mod.name}`;

        for (const modDependency of Object.keys(mod.dependencies))
        {
            const requiredVersion = mod.dependencies[modDependency];

            // Raise dependency version incompatible if the dependency is not found in the mod list
            if (!(modDependency in loadedMods))
            {
                Logger.error(
                    `Mod ${modName} requires ${modDependency} to be installed.`
                );
                return false;
            }

            if (
                !semver.satisfies(
                    loadedMods[modDependency].version,
                    requiredVersion
                )
            )
            {
                Logger.error(
                    `Mod ${modName} requires ${modDependency} version "${requiredVersion}". Current installed version is "${loadedMods[modDependency].version}"`
                );
                return false;
            }
        }

        return true;
    }

    static isModCompatible(mod, loadedMods)
    {
        const incompatbileModsList = mod.incompatibilities;
        if (!incompatbileModsList)
        {
            return true;
        }

        for (const incompatibleModName of incompatbileModsList)
        {
            // Raise dependency version incompatible if any incompatible mod is found
            if (incompatibleModName in loadedMods)
            {
                Logger.error(
                    `Mod ${mod.author}-${mod.name} is incompatible with ${incompatibleModName}`
                );
                return false;
            }
        }

        return true;
    }

    static validMod(mod)
    {
        // check if config exists
        if (!VFS.exists(`${ModLoader.getModPath(mod)}/package.json`))
        {
            console.log(`Mod ${mod} is missing package.json`);
            return false;
        }

        // validate mod
        const config = JsonUtil.deserialize(
            VFS.readFile(`${ModLoader.getModPath(mod)}/package.json`)
        );
        const checks = ["name", "author", "version", "license"];
        let issue = false;

        for (const check of checks)
        {
            if (!(check in config))
            {
                console.log(
                    `Mod ${mod} package.json requires ${check} property`
                );
                issue = true;
            }
        }

        if (!semver.valid(config.version))
        {
            console.log(
                `Mod ${mod} package.json contains an invalid version string`
            );
            issue = true;
        }

        if ("main" in config)
        {
            if (config.main.split(".").pop() !== "js")
            {
                console.log(
                    `Mod ${mod} package.json main property must be a .js file`
                );
                issue = true;
            }

            if (!VFS.exists(`${ModLoader.getModPath(mod)}/${config.main}`))
            {
                console.log(
                    `Mod ${mod} package.json main property points to non-existing file`
                );
                issue = true;
            }
        }

        if (
            config.incompatibilities &&
            !Array.isArray(config.incompatibilities)
        )
        {
            console.log(
                `Mod ${mod} package.json property 'incompatibilities' should be a string array`
            );
            issue = true;
        }

        return !issue;
    }

    static getLoadOrderRecursive(mod, result, visited)
    {
        // validate package
        if (mod in result)
        {
            return;
        }

        if (mod in visited)
        {
            // front: white, back: red
            Logger.error("Cyclic dependency detected");

            // additional info
            Logger.log(`checking: ${mod}`);
            Logger.log("checked:");
            Logger.log(result);
            Logger.log("visited:");
            Logger.log(visited);

            // wait for input
            process.exit(1);
        }

        // check dependencies
        const config = ModLoader.imported[mod];

        if (typeof config === "undefined")
        {
            Logger.error(`Missing required mod dependency: ${mod}`);
            throw "Error parsing mod load order";
        }

        const dependencies =
            "dependencies" in config ? config.dependencies : [];

        visited[mod] = config.version;

        for (const dependency in dependencies)
        {
            ModLoader.getLoadOrderRecursive(dependency, result, visited);
        }

        delete visited[mod];

        // fully checked package
        result[mod] = config.version;
    }

    static getLoadOrder(mods)
    {
        const result = {};
        const visited = {};

        for (const mod in mods)
        {
            if (mods[mod][0] in result)
            {
                continue;
            }

            ModLoader.getLoadOrderRecursive(mod, result, visited);
        }

        return result;
    }
}

module.exports = ModLoader;

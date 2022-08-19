"use strict";

require("../Lib.js");

class ConfigServer
{
    static configs = {};

    static getConfig(configType)
    {
        return ConfigServer.configs[configType];
    }

    static initialize()
    {
        Logger.info("Importing configs...");

        // get all filepaths
        const filepath = globalThis.G_RELEASE_CONFIGURATION
            ? "Aki_Data/Server/configs/"
            : "./assets/configs/";
        const files = VFS.getFiles(filepath);

        // add file content to result
        for (const file of files)
        {
            if (VFS.getFileExtension(file) === "json")
            {
                const filename = VFS.stripExtension(file);
                const filePathAndName = `${filepath}${file}`;
                ConfigServer.configs[`aki-${filename}`] =
                    JsonUtil.deserializeWithCacheCheck(
                        VFS.readFile(filePathAndName),
                        filePathAndName
                    );
            }
        }

        // configs
        globalThis.AirdropConfig = ConfigServer.getConfig(ConfigTypes.AIRDROP);
        globalThis.BotConfig = ConfigServer.getConfig(ConfigTypes.BOT);
        globalThis.CoreConfig = ConfigServer.getConfig(ConfigTypes.CORE);
        globalThis.HealthConfig = ConfigServer.getConfig(ConfigTypes.HEALTH);
        globalThis.HideoutConfig = ConfigServer.getConfig(ConfigTypes.HIDEOUT);
        globalThis.HttpConfig = ConfigServer.getConfig(ConfigTypes.HTTP);
        globalThis.InraidConfig = ConfigServer.getConfig(ConfigTypes.IN_RAID);
        globalThis.InsuranceConfig = ConfigServer.getConfig(
            ConfigTypes.INSURANCE
        );
        globalThis.InventoryConfig = ConfigServer.getConfig(
            ConfigTypes.INVENTORY
        );
        globalThis.LocaleConfig = ConfigServer.getConfig(ConfigTypes.LOCALE);
        globalThis.LocationConfig = ConfigServer.getConfig(
            ConfigTypes.LOCATION
        );
        globalThis.MatchConfig = ConfigServer.getConfig(ConfigTypes.MATCH);
        globalThis.PlayerScavConfig = ConfigServer.getConfig(
            ConfigTypes.PLAYERSCAV
        );
        globalThis.QuestConfig = ConfigServer.getConfig(ConfigTypes.QUEST);
        globalThis.RagfairConfig = ConfigServer.getConfig(ConfigTypes.RAGFAIR);
        globalThis.RepairConfig = ConfigServer.getConfig(ConfigTypes.REPAIR);
        globalThis.ScavCaseConfig = ConfigServer.getConfig(
            ConfigTypes.SCAVCASE
        );
        globalThis.TraderConfig = ConfigServer.getConfig(ConfigTypes.TRADER);
        globalThis.WeatherConfig = ConfigServer.getConfig(ConfigTypes.WEATHER);
    }
}

module.exports = ConfigServer;

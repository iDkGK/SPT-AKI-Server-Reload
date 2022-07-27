"use strict";

require("../Lib.js");

class ConfigServer
{
    static configs = {};

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
        globalThis.AkiConfig = ConfigServer.configs["aki-core"];
        globalThis.BotConfig = ConfigServer.configs["aki-bot"];
        globalThis.HealthConfig = ConfigServer.configs["aki-health"];
        globalThis.HideoutConfig = ConfigServer.configs["aki-hideout"];
        globalThis.HttpConfig = ConfigServer.configs["aki-http"];
        globalThis.InraidConfig = ConfigServer.configs["aki-inraid"];
        globalThis.InsuranceConfig = ConfigServer.configs["aki-insurance"];
        globalThis.InventoryConfig = ConfigServer.configs["aki-inventory"];
        globalThis.LocationConfig = ConfigServer.configs["aki-location"];
        globalThis.MatchConfig = ConfigServer.configs["aki-match"];
        globalThis.QuestConfig = ConfigServer.configs["aki-quest"];
        globalThis.RagfairConfig = ConfigServer.configs["aki-ragfair"];
        globalThis.RepairConfig = ConfigServer.configs["aki-repair"];
        globalThis.TraderConfig = ConfigServer.configs["aki-trader"];
        globalThis.WeatherConfig = ConfigServer.configs["aki-weather"];
    }
}

module.exports = ConfigServer;

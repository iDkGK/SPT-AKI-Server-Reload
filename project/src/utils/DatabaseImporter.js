"use strict";

require("../Lib.js");

class DatabaseImporter
{
    static load()
    {
        const filepath = globalThis.G_RELEASE_CONFIGURATION
            ? "Aki_Data/Server/"
            : "./assets/";

        DatabaseImporter.hydrateDatabase(filepath);
        DatabaseImporter.loadImages(`${filepath}images/`);
    }

    /**
     * Read all json files in database folder and map into a json object
     * @param filepath path to database folder
     */
    static hydrateDatabase(filepath)
    {
        Logger.info("Importing database...");

        const dataToImport = DatabaseImporter.loadRecursive(
            `${filepath}database/`
        );

        DatabaseServer.setTables(dataToImport);
    }

    static loadRecursive(filepath)
    {
        const result = {};

        // get all filepaths
        const files = VFS.getFiles(filepath);
        const directories = VFS.getDirs(filepath);

        // add file content to result
        for (const file of files)
        {
            if (VFS.getFileExtension(file) === "json")
            {
                const filename = VFS.stripExtension(file);
                const filePathAndName = `${filepath}${file}`;
                result[filename] = JsonUtil.deserializeWithCacheCheck(
                    VFS.readFile(filePathAndName),
                    filePathAndName
                );
            }
        }

        // deep tree search
        for (const dir of directories)
        {
            result[dir] = DatabaseImporter.loadRecursive(`${filepath}${dir}/`);
        }

        return result;
    }

    static loadImages(filepath)
    {
        const dirs = VFS.getDirs(filepath);
        const routes = [
            "/files/CONTENT/banners/",
            "/files/handbook/",
            "/files/Hideout/",
            "/files/launcher/",
            "/files/quest/icon/",
            "/files/trader/avatar/",
        ];

        for (const i in dirs)
        {
            const files = VFS.getFiles(`${filepath}${dirs[i]}`);

            for (const file of files)
            {
                const filename = VFS.stripExtension(file);
                ImageRouter.addRoute(
                    `${routes[i]}${filename}`,
                    `${filepath}${dirs[i]}/${file}`
                );
            }
        }

        ImageRouter.addRoute("/favicon.ico", `${filepath}icon.ico`);
    }
}

module.exports = DatabaseImporter;

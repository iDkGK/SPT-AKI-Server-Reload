"use strict";

require("../Lib.js");

class DatabaseImporter
{
    static load()
    {
        const filepath = (globalThis.G_RELEASE_CONFIGURATION) ? "Aki_Data/Server/" : "./assets/";

        Logger.info("Importing database...");
        DatabaseServer.tables = DatabaseImporter.loadRecursive(`${filepath}database/`);
        DatabaseImporter.loadImages(`${filepath}images/`);
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
                result[filename] = JsonUtil.deserializeWithCacheCheck(VFS.readFile(filePathAndName), filePathAndName);
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
                ImageRouter.onRoute[`${routes[i]}${filename}`] = `${filepath}${dirs[i]}/${file}`;
            }
        }

        ImageRouter.onRoute["/favicon.ico"] = `${filepath}icon.ico`;
    }
}

module.exports = DatabaseImporter;

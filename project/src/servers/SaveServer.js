"use strict";

require("../Lib.js");

class SaveServer
{
    static filepath = "user/profiles/";
    static profiles = {};
    static onLoad = require("../bindings/SaveLoad");
    static onSave = {};
    static SaveMd5 = {};

    static load()
    {
        // get files to load
        if (!VFS.exists(SaveServer.filepath))
        {
            VFS.createDir(SaveServer.filepath);
        }

        const files = VFS.getFiles(SaveServer.filepath).filter((item) =>
        {
            return VFS.getFileExtension(item) === "json";
        });

        // load profiles
        for (const file of files)
        {
            SaveServer.loadProfile(VFS.stripExtension(file));
        }

        RagfairServer.addPlayerOffers();
        RagfairServer.update();
    }

    static save()
    {
        // load profiles
        for (const sessionID in SaveServer.profiles)
        {
            SaveServer.saveProfile(sessionID);
        }
    }

    static loadProfile(sessionID)
    {
        const file = `${SaveServer.filepath}${sessionID}.json`;

        if (VFS.exists(file))
        {
            // load profile
            SaveServer.profiles[sessionID] = JsonUtil.deserialize(VFS.readFile(file));
        }

        // run callbacks
        for (const callback in SaveServer.onLoad)
        {
            SaveServer.profiles[sessionID] = SaveServer.onLoad[callback](sessionID);
        }
    }

    static saveProfile(sessionID)
    {
        const file = `${SaveServer.filepath}${sessionID}.json`;

        // run callbacks
        for (const callback in SaveServer.onSave)
        {
            SaveServer.profiles[sessionID] = SaveServer.onSave[callback](sessionID);
        }

        const JsonProfile = JsonUtil.serialize(SaveServer.profiles[sessionID], true);
        const fmd5 = HashUtil.generateMd5ForData(JsonProfile);
        if (typeof(SaveServer.SaveMd5[sessionID]) !== "string" || SaveServer.SaveMd5[sessionID] !== fmd5)
        {
            SaveServer.SaveMd5[sessionID] = String(fmd5);
            // save profile
            VFS.writeFile(file, JsonProfile);
            Logger.debug("Profile file updated");
        }
    }

    static removeProfile(sessionID)
    {
        const file = `${SaveServer.filepath}${sessionID}.json`;

        delete SaveServer.profiles[sessionID];

        VFS.removeFile(file);

        return !VFS.exists(file);
    }
}

module.exports = SaveServer;

"use strict";

require("../Lib.js");

class SaveServer
{
    static profiles = {};
    static onSave = {};
    static saveMd5 = {};

    static get profileFilepath()
    {
        return "user/profiles/";
    }

    static get onLoad()
    {
        return require("../bindings/SaveLoad");
    }

    static load()
    {
        // get files to load
        if (!VFS.exists(SaveServer.profileFilepath))
        {
            VFS.createDir(SaveServer.profileFilepath);
        }

        const files = VFS.getFiles(SaveServer.profileFilepath).filter(item =>
        {
            return VFS.getFileExtension(item) === "json";
        });

        // load profiles
        for (const file of files)
        {
            SaveServer.loadProfile(VFS.stripExtension(file));
        }
    }

    static save()
    {
        // load profiles
        for (const sessionID in SaveServer.profiles)
        {
            SaveServer.saveProfile(sessionID);
        }
    }

    static getProfile(sessionId)
    {
        if (!sessionId)
        {
            throw new Error("session id provided was empty");
        }

        return SaveServer.profiles[sessionId];
    }

    static getProfiles()
    {
        return SaveServer.profiles;
    }

    static deleteProfileById(sessionID)
    {
        if (SaveServer.profiles[sessionID] !== undefined)
        {
            delete SaveServer.profiles[sessionID];
            return true;
        }

        return false;
    }

    static createProfile(profileInfo)
    {
        if (SaveServer.profiles[profileInfo.id] !== undefined)
        {
            throw new Error(
                `profile already exists for sessionId: ${profileInfo.id}`
            );
        }

        SaveServer.profiles[profileInfo.id] = {
            info: profileInfo,
            characters: { pmc: {}, scav: {} },
        };
    }

    /*
        Add profile to internal profiles array
    */
    static addProfile(profileDetails)
    {
        SaveServer.profiles[profileDetails.info.id] = profileDetails;
    }

    static loadProfile(sessionID)
    {
        const filePath = `${SaveServer.profileFilepath}${sessionID}.json`;

        if (VFS.exists(filePath))
        {
            // file found, store in profiles[]
            SaveServer.profiles[sessionID] = JsonUtil.deserialize(
                VFS.readFile(filePath)
            );
        }

        // run callbacks
        for (const callback in SaveServer.onLoad)
        {
            SaveServer.profiles[sessionID] = SaveServer.onLoad[callback](
                SaveServer.getProfile(sessionID)
            );
        }
    }

    static saveProfile(sessionID)
    {
        const filePath = `${SaveServer.profileFilepath}${sessionID}.json`;

        // run callbacks
        for (const callback in SaveServer.onSave)
        {
            SaveServer.profiles[sessionID] =
                SaveServer.onSave[callback](sessionID);
        }

        const jsonProfile = JsonUtil.serialize(
            SaveServer.profiles[sessionID],
            true
        );
        const fmd5 = HashUtil.generateMd5ForData(jsonProfile);
        if (
            typeof SaveServer.saveMd5[sessionID] !== "string" ||
            SaveServer.saveMd5[sessionID] !== fmd5
        )
        {
            SaveServer.saveMd5[sessionID] = String(fmd5);
            // save profile
            VFS.writeFile(filePath, jsonProfile);
            Logger.debug("Profile updated");
        }
    }

    static removeProfile(sessionID)
    {
        const file = `${SaveServer.profileFilepath}${sessionID}.json`;

        delete SaveServer.profiles[sessionID];

        VFS.removeFile(file);

        return !VFS.exists(file);
    }
}

module.exports = SaveServer;

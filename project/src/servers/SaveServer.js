"use strict";

require("../Lib.js");

class SaveServer
{
    static profileFilepath = "user/profiles/";
    static profiles = {};
    static onLoad = require("../bindings/SaveLoad");
    static onSave = {};
    static SaveMd5 = {};

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

    static getProfile(sessionId)
    {
        if (!sessionId)
        {
            throw new Error("session id provided was empty");
        }

        if (SaveServer.profiles === null)
        {
            throw new Error("no profiles found in saveServer");
        }

        if (SaveServer.profiles[sessionId] === null)
        {
            throw new Error(`no profile found for sessionId: ${sessionId}`);
        }

        return SaveServer.profiles[sessionId];
    }

    static getProfiles()
    {
        return SaveServer.profiles;
    }

    static deleteProfileById(sessionID)
    {
        if (SaveServer.profiles[sessionID] !== null)
        {
            delete SaveServer.profiles[sessionID];
            return true;
        }
        return false;
    }

    static createProfile(profileInfo)
    {
        if (SaveServer.profiles[profileInfo.id] !== null)
        {
            throw new console.error(
                `profile already exists for sessionId: ${profileInfo.id}`
            );
        }

        SaveServer.profiles[profileInfo.id] = {
            info: profileInfo,
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
            SaveServer.profiles[sessionID] =
                SaveServer.onLoad[callback](sessionID);
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

        const JsonProfile = JsonUtil.serialize(
            SaveServer.profiles[sessionID],
            true
        );
        const fmd5 = HashUtil.generateMd5ForData(JsonProfile);
        if (
            typeof SaveServer.SaveMd5[sessionID] !== "string" ||
            SaveServer.SaveMd5[sessionID] !== fmd5
        )
        {
            SaveServer.SaveMd5[sessionID] = String(fmd5);
            // save profile
            VFS.writeFile(filePath, JsonProfile);
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

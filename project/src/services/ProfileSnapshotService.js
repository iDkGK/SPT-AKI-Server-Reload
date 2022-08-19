"use strict";

require("../Lib.js");

class ProfileSnapshotService
{
    static storedProfileSnapshots = {};

    /**
     * Store a profile into an in-memory object
     * @param sessionID session id - acts as the key
     * @param profile - profile to save
     */
    static storeProfileSnapshot(sessionID, profile)
    {
        ProfileSnapshotService.storedProfileSnapshots[sessionID] = JsonUtil.clone(profile);
    }

    /**
     * Retreve a stored profile
     * @param sessionID key
     * @returns A player profile object
     */
    static getProfileSnapshot(sessionID)
    {
        if (ProfileSnapshotService.storedProfileSnapshots[sessionID])
        {
            return ProfileSnapshotService.storedProfileSnapshots[sessionID];
        }

        return null;
    }

    /**
     * Does a profile exists against the provided key
     * @param sessionID key
     * @returns true if exists
     */
    static hasProfileSnapshot(sessionID)
    {
        if (ProfileSnapshotService.storedProfileSnapshots[sessionID])
        {
            return true;
        }

        return false;
    }

    /**
     * Remove a stored profile by key
     * @param sessionID key
     */
    static clearProfileSnapshot(sessionID)
    {
        delete ProfileSnapshotService.storedProfileSnapshots[sessionID];
    }
}

module.exports = ProfileSnapshotService;

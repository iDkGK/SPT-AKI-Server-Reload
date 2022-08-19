"use strict";

require("../Lib.js");

class LocationCallbacks
{
    static getLocationData(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(LocationController.generateAll());
    }

    static getLocation(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            LocationController.get(info.locationId)
        );
    }
}

module.exports = LocationCallbacks;

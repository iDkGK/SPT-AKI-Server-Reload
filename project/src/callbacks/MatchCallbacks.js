"use strict";

require("../Lib.js");

class MatchCallbacks
{
    static updatePing(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static exitMatch(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static exitToMenu(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static startGroupSearch(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static stopGroupSearch(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static sendGroupInvite(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static acceptGroupInvite(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static cancelGroupInvite(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static putMetrics(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static getProfile(url, info, sessionID)
    {
        return HttpResponse.getBody(MatchController.getProfile(info));
    }

    static serverAvailable(url, info, sessionID)
    {
        const output = MatchController.getEnabled();

        if (output === false)
        {
            return HttpResponse.getBody(null, 420, "Please play as PMC and go through the offline settings screen before pressing ready.");
        }

        return HttpResponse.getBody(output);
    }

    static joinMatch(url, info, sessionID)
    {
        return HttpResponse.getBody(MatchController.joinMatch(info, sessionID));
    }

    static getMetrics(url, info, sessionID)
    {
        return HttpResponse.getBody(JsonUtil.serialize(DatabaseServer.tables.match.metrics));
    }

    static getGroupStatus(url, info, sessionID)
    {
        return HttpResponse.getBody(MatchController.getGroupStatus(info));
    }

    static createGroup(url, info, sessionID)
    {
        return HttpResponse.getBody(MatchController.createGroup(sessionID, info));
    }

    static deleteGroup(url, info, sessionID)
    {
        MatchController.deleteGroup(info);
        return HttpResponse.nullResponse();
    }

    static startOfflineRaid(url, info, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static endOfflineRaid(url, info, sessionID)
    {
        MatchController.endOfflineRaid(info, sessionID);
        return HttpResponse.nullResponse();
    }
}

module.exports = MatchCallbacks;

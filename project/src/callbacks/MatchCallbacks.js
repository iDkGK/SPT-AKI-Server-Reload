"use strict";

require("../Lib.js");

class MatchCallbacks
{
    static updatePing(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static exitMatch(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static exitToMenu(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static startGroupSearch(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static stopGroupSearch(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static sendGroupInvite(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static acceptGroupInvite(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static cancelGroupInvite(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static putMetrics(url, info, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static getProfile(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(MatchController.getProfile(info));
    }

    static serverAvailable(url, info, sessionID)
    {
        const output = MatchController.getEnabled();

        if (output === false)
        {
            return HttpResponseUtil.getBody(
                null,
                420,
                "Please play as PMC and go through the offline settings screen before pressing ready."
            );
        }

        return HttpResponseUtil.getBody(output);
    }

    static joinMatch(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            MatchController.joinMatch(info, sessionID)
        );
    }

    static getMetrics(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            JsonUtil.serialize(DatabaseServer.getTables().match.metrics)
        );
    }

    static getGroupStatus(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(MatchController.getGroupStatus(info));
    }

    static createGroup(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            MatchController.createGroup(sessionID, info)
        );
    }

    static deleteGroup(url, info, sessionID)
    {
        MatchController.deleteGroup(info);
        return HttpResponseUtil.nullResponse();
    }

    static startOfflineRaid(url, info, sessionID)
    {
        MatchController.startOfflineRaid(info, sessionID);
        return HttpResponseUtil.nullResponse();
    }

    static endOfflineRaid(url, info, sessionID)
    {
        MatchController.endOfflineRaid(info, sessionID);
        return HttpResponseUtil.nullResponse();
    }
}

module.exports = MatchCallbacks;

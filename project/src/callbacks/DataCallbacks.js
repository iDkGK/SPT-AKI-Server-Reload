"use strict";

require("../Lib.js");

class DataCallbacks
{
    static getSettings(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(DatabaseServer.getTables().settings);
    }

    static getGlobals(url, info, sessionID)
    {
        DatabaseServer.getTables().globals.time = Date.now() / 1000;
        return HttpResponseUtil.getBody(DatabaseServer.getTables().globals);
    }

    static getTemplateItems(url, info, sessionID)
    {
        return HttpResponseUtil.getUnclearedBody(
            DatabaseServer.getTables().templates.items
        );
    }

    static getTemplateHandbook(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DatabaseServer.getTables().templates.handbook
        );
    }

    static getTemplateSuits(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DatabaseServer.getTables().templates.customization
        );
    }

    static getTemplateCharacter(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DatabaseServer.getTables().templates.character
        );
    }

    static getTemplateQuests(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DatabaseServer.getTables().templates.quests
        );
    }

    static getHideoutSettings(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DatabaseServer.getTables().hideout.settings
        );
    }

    static getHideoutAreas(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DatabaseServer.getTables().hideout.areas
        );
    }

    static gethideoutProduction(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DatabaseServer.getTables().hideout.production
        );
    }

    static getHideoutScavcase(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DatabaseServer.getTables().hideout.scavcase
        );
    }

    static getLocalesLanguages(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DatabaseServer.getTables().locales.languages
        );
    }

    static getLocalesMenu(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DatabaseServer.getTables().locales.menu[
                url.replace("/client/menu/locale/", "")
            ]
        );
    }

    static getLocalesGlobal(url, info, sessionID)
    {
        return HttpResponseUtil.getUnclearedBody(
            DatabaseServer.getTables().locales.global[
                url.replace("/client/locale/", "")
            ]
        );
    }
}

module.exports = DataCallbacks;

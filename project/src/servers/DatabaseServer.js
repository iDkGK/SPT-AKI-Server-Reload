"use strict";

require("../Lib.js");

class DatabaseServer
{
    static tableData = {
        bots: undefined,
        hideout: undefined,
        locales: undefined,
        locations: undefined,
        loot: undefined,
        match: undefined,
        templates: undefined,
        traders: undefined,
        globals: undefined,
        server: undefined,
        settings: undefined,
    };

    static getTables()
    {
        return DatabaseServer.tableData;
    }

    static setTables(any)
    {
        DatabaseServer.tableData = any;
    }
}

module.exports = DatabaseServer;

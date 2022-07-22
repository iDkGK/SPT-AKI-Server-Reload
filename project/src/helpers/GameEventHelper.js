"use strict";

require("../Lib.js");

class GameEventHelper
{
    static get EVENT()
    {
        return {
            "None": "None",
            "Christmas": "Christmas",
            "Halloween": "Halloween"
        };
    }

    static get christmasEventItems()
    {
        return [
            "5c1a1e3f2e221602b66cc4c2", // White beard
            "5df8a6a186f77412640e2e80", // Red bauble
            "5df8a77486f77412672a1e3f", // Violet bauble
            "5df8a72c86f77412640e2e83", // Silver bauble
            "5a43943586f77416ad2f06e2", // Ded moroz hat
            "5a43957686f7742a2c2f11b0", // Santa hat
        ];
    }

    static itemIsChristmasRelated(itemId)
    {
        return GameEventHelper.christmasEventItems.includes(itemId);
    }

    static christmasEventEnabled()
    {
        return DatabaseServer.tables.globals.config.EventType.includes(GameEventHelper.EVENT.Christmas);
    }

}

module.exports = GameEventHelper;

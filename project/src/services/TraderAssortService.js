"use strict";

require("../Lib.js");

class TraderAssortService
{
    static pristineTraderAssorts = {};

    static getPristineTraderAssort(traderId)
    {
        return TraderAssortService.pristineTraderAssorts[traderId];
    }

    /**
     * Store trader assorts inside a class property
     * @param traderId Traderid to store assorts against
     * @param assort Assorts to store
     */
    static setPristineTraderAssort(traderId, assort)
    {
        TraderAssortService.pristineTraderAssorts[traderId] = assort;
    }
}

module.exports = TraderAssortService;
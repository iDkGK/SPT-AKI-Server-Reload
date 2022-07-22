"use strict";

module.exports = {
    "updateTime": [
        {
            "traderId": TraderHelper.TRADER.Prapor,
            "seconds": 3600,
        },
        {
            "traderId": TraderHelper.TRADER.Therapist,
            "seconds": 3600,
        },
        {
            "traderId": TraderHelper.TRADER.Fence,
            "seconds": 3600,
        },
        {
            "traderId": TraderHelper.TRADER.Skier,
            "seconds": 3600,
        },
        {
            "traderId": TraderHelper.TRADER.Peacekeeper,
            "seconds": 3600,
        },
        {
            "traderId": TraderHelper.TRADER.Mechanic,
            "seconds": 3600,
        },
        {
            "traderId": TraderHelper.TRADER.Ragman,
            "seconds": 3600,
        },
        {
            "traderId": TraderHelper.TRADER.Jaeger,
            "seconds": 3600,
        },
        {
            "traderId": "ragfair",
            "seconds": 3600
        }
    ],
    "updateTimeDefault": 3600,
    "fenceAssortSize": 100,
    "fenceMaxPresetsCount": 5,
    "fencePresetPriceMult": 2.5,
    "minDurabilityForSale": 60,
    "fenceItemIgnoreList": [
        "58ac60eb86f77401897560ff", // Dev balaclava
        "59e8936686f77467ce798647", // Test balaclava
        "56e294cdd2720b603a8b4575", // Mystery Ranch Terraplane backpack

        "5661632d4bdc2d903d8b456b", // stackable
        "543be5e94bdc2df1348b4568", // keys
        "543be6674bdc2df1348b4569", // food or drink
        "5448bf274bdc2dfc2f8b456a", // portable container (secure containers)
        "543be5664bdc2dd4348b4569", // meds
        "5447bedf4bdc2d87278b4568" // grenade launcher
    ]
};
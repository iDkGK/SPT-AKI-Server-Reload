"use strict";

module.exports = {
    "runIntervalSeconds": 900,
    "scavCase": {
        "rewardParentBlacklist": [
            ItemHelper.BASECLASS.Ammo,
            ItemHelper.BASECLASS.Money
        ],
        "rewardItemBlacklist": [

        ],
        "ammoRewards": {
            "giveMultipleOfTen": true,
            "minAmount": 10
        },
        "moneyRewards": {
            "enabled": false,
            "rub": {
                "min": 1000,
                "max": 200000
            },
            "usd": {
                "min": 100,
                "max": 2000
            },
            "eur": {
                "min": 100,
                "max": 2000
            }
        }
    }
};
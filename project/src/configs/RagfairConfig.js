"use strict";

module.exports = {
    "runIntervalSeconds": 60,
    "sell": {
        "fees": true,
        "chance": {
            "base": 50,
            "overprices": 0.5,
            "underpriced": 2
        },
        "time": {
            "base": 15,
            "min": 5,
            "max": 15
        },
        "reputation": {
            "gain": 0.0000002,
            "loss": 0.0000002
        }
    },
    "traders": {
        "54cb50c76803fa8b248b4571": true,
        "54cb57776803fa99248b456e": true,
        "579dc571d53a0658a154fbec": false,
        "58330581ace78e27b8b10cee": true,
        "5935c25fb3acc3127c3d8cd9": true,
        "5a7c2eca46aef81a7ca2145d": true,
        "5ac3b934156ae10c4430e83c": true,
        "5c0647fdd443bc2504c2d371": true,
        "ragfair": false
    },
    "dynamic": {
        "expiredOfferThreshold": 1500,
        "offerItemCount": {
            "min": 7,
            "max": 15
        },
        "price": {
            "min": 0.8,
            "max": 1.2
        },
        "endTimeSeconds": {
            "min": 180,
            "max": 1800
        },
        "condition": {
            "conditionChance": 0.2,
            "min": 0.6,
            "max": 1
        },
        "stackablePercent": {
            "min": 10,
            "max": 500
        },
        "nonStackableCount": {
            "min": 1,
            "max": 10
        },
        "rating": {
            "min": 0.1,
            "max": 0.95
        },
        "currencies": {
            "5449016a4bdc2d6f028b456f": 75,
            "5696686a4bdc2da3298b456a": 23,
            "569668774bdc2da2298b4568": 2
        },
        "showAsSingleStack": [
            ItemHelper.BASECLASS.Weapon,
            ItemHelper.BASECLASS.Armor,
            ItemHelper.BASECLASS.SimpleContainer,
            ItemHelper.BASECLASS.Backpack,
            ItemHelper.BASECLASS.MobContainer, // portable container
            ItemHelper.BASECLASS.Key,
            ItemHelper.BASECLASS.MedKit
        ],
        "blacklist": {
            "custom": [
                "5cdeb229d7f00c000e7ce174", // NSV static MG
                "5996f6d686f77467977ba6cc", // grenade shrapnel
                "5996f6cb86f774678763a6ca", // grenade shrapnel
                "5943d9c186f7745a13413ac9", // grenade shrapnel
                "5996f6fc86f7745e585b4de3", // grenade shrapnel
                "5cde8864d7f00c0010373be1", // 12.7x108mm B-32 gl static gl ammo
                "5d2f2ab648f03550091993ca" // 12.7x108mm BZT-44M gzh static mg ammo
            ],
            "enableBsgList": true,
            "enableQuestList": true
        }
    }
};
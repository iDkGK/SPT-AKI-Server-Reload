"use strict";

module.exports = {
    "redeemTime": 48,
    "repeatableQuests": [
        {
            "name": "Daily",
            "types": ["Elimination", "Completion", "Exploration"],
            "resetTime": 60 * 60 * 24,
            "numQuests":3,
            "minPlayerLevel": 5,
            "rewardScaling": {
                "levels": [1, 20, 45, 100],
                "experience":  [2000, 4000, 20000, 80000],
                "roubles": [6000, 10000, 100000, 250000],
                "items": [1, 2, 4, 4],
                "reputation": [0.01, 0.01, 0.01, 0.01],
                "rewardSpread": 0.5 // spread for factor of reward at 0.5 the reward according to level is multiplied by a random value between 0.5 and 1.5
            },
            "locations": {
                "any": ["any"],
                "factory4_day": ["factory4_day", "factory4_night"],
                "bigmap": ["bigmap"],
                "Woods": ["Woods"],
                "Shoreline": ["Shoreline"],
                "Interchange": ["Interchange"],
                "Lighthouse": ["Lighthouse"],
                "laboratory": ["laboratory"],
                "RezervBase": ["RezervBase"]
            },
            "traderWhitelist": [
                {
                    "traderId": TraderHelper.TRADER.Prapor,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                },
                {
                    "traderId": TraderHelper.TRADER.Therapist,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                },
                {
                    "traderId": TraderHelper.TRADER.Skier,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                },
                {
                    "traderId": TraderHelper.TRADER.Peacekeeper,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                },
                {
                    "traderId": TraderHelper.TRADER.Mechanic,
                    "questTypes": ["Completion", "Exploration"]
                },
                {
                    "traderId": TraderHelper.TRADER.Ragman,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                },
                {
                    "traderId": TraderHelper.TRADER.Jaeger,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                }
            ],
            "questConfig": {
                "Exploration": {
                    "maxExtracts": 3,
                    "specificExits": {
                        "probability": 0.25,
                        "passageRequirementWhitelist": [
                            "None",
                            "TransferItem",     // car extracts
                            "WorldEvent",       // activate trigger condition
                            "Train",
                            "Reference",        // special stuff like cliff descent
                            "Empty"             // no backpack
                        ]                       // currently all but "ScavCooperation"
                    }
                },
                "Completion": {
                    "minRequestedAmount": 1,
                    "maxRequestedAmount": 5,
                    "minRequestedBulletAmount": 20,
                    "maxRequestedBulletAmount": 60,
                    "useWhitelist": true,
                    "useBlacklist": false,
                },
                "Elimination": {
                    "targets": [
                        {
                            "key": "Savage",
                            "relativeProbability": 7,
                            "data": { "isBoss": false }
                        },
                        {
                            "key": "AnyPmc",
                            "relativeProbability": 2,
                            "data": { "isBoss": false }
                        },
                        {
                            "key": "bossBully",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                        {
                            "key": "bossGluhar",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                        {
                            "key": "bossKilla",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                        {
                            "key": "bossSanitar",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                        {
                            "key": "bossTagilla",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                        {
                            "key": "bossKojaniy",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                    ],
                    "bodyPartProb": 0.4,
                    "bodyParts": [
                        {
                            "key": "Head",
                            "relativeProbability": 1,
                            "data": ["Head"]
                        },
                        {
                            "key": "Stomach",
                            "relativeProbability": 3,
                            "data": ["Stomach"]
                        },
                        {
                            "key": "Chest",
                            "relativeProbability": 5,
                            "data": ["Chest"]
                        },
                        {
                            "key": "Arms",
                            "relativeProbability": 0.5,
                            "data": ["LeftArm", "RightArm"]
                        },
                        {
                            "key": "Legs",
                            "relativeProbability": 1,
                            "data": ["LeftLeg", "RightLeg"]
                        },
                    ],
                    "specificLocationProb": 0.25,
                    "distLocationBlacklist": ["laboratory", "factory4_day", "factory4_night"],
                    "distProb": 0.25,
                    "maxDist": 200,
                    "minDist": 20,
                    "maxKills": 5,
                    "minKills": 2
                }
            }
        },
        {
            "name": "Weekly",
            "types": ["Elimination", "Completion", "Exploration"],
            "resetTime": 7 * 60 * 60 * 24,
            "numQuests": 1,
            "minPlayerLevel": 15,
            "rewardScaling": {
                "levels": [1, 20, 45, 100],
                "experience":  [4000, 8000, 40000, 160000],
                "roubles": [12000, 20000, 200000, 500000],
                "items": [3, 3, 4, 4],
                "reputation": [0.02, 0.03, 0.03, 0.03],
                "rewardSpread": 0.5 // spread for factor of reward at 0.5 the reward according to level is multiplied by a random value between 0.5 and 1.5
            },
            "locations": {
                "any": ["any"],
                "factory4_day": ["factory4_day", "factory4_night"],
                "bigmap": ["bigmap"],
                "Woods": ["Woods"],
                "Shoreline": ["Shoreline"],
                "Interchange": ["Interchange"],
                "Lighthouse": ["Lighthouse"],
                "laboratory": ["laboratory"],
                "RezervBase": ["RezervBase"]
            },
            "traderWhitelist": [
                {
                    "traderId": TraderHelper.TRADER.Prapor,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                },
                {
                    "traderId": TraderHelper.TRADER.Therapist,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                },
                {
                    "traderId": TraderHelper.TRADER.Skier,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                },
                {
                    "traderId": TraderHelper.TRADER.Peacekeeper,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                },
                {
                    "traderId": TraderHelper.TRADER.Mechanic,
                    "questTypes": ["Completion", "Exploration"]
                },
                {
                    "traderId": TraderHelper.TRADER.Ragman,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                },
                {
                    "traderId": TraderHelper.TRADER.Jaeger,
                    "questTypes": ["Completion", "Exploration", "Elimination"]
                }
            ],
            "questConfig": {
                "Exploration": {
                    "maxExtracts": 10,
                    "specificExits": {
                        "probability": 0.5,
                        "passageRequirementWhitelist": [
                            "None",
                            "TransferItem",     // car extracts
                            "WorldEvent",       // activate trigger condition
                            "Train",
                            "Reference",        // special stuff like cliff descent
                            "Empty"             // no backpack
                        ]                       // currently all but "ScavCooperation"
                    }
                },
                "Completion": {
                    "minRequestedAmount": 2,
                    "maxRequestedAmount": 10,
                    "minRequestedBulletAmount": 20,
                    "maxRequestedBulletAmount": 60,
                    "useWhitelist": true,
                    "useBlacklist": false,
                },
                "Elimination": {
                    "targets": [
                        {
                            "key": "Savage",
                            "relativeProbability": 7,
                            "data": { "isBoss": false }
                        },
                        {
                            "key": "AnyPmc",
                            "relativeProbability": 2,
                            "data": { "isBoss": false }
                        },
                        {
                            "key": "bossBully",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                        {
                            "key": "bossGluhar",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                        {
                            "key": "bossKilla",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                        {
                            "key": "bossSanitar",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                        {
                            "key": "bossTagilla",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                        {
                            "key": "bossKojaniy",
                            "relativeProbability": 0.5,
                            "data": { "isBoss": true }
                        },
                    ],
                    "bodyPartProb": 0.4,
                    "bodyParts": [
                        {
                            "key": "Head",
                            "relativeProbability": 1,
                            "data": ["Head"]
                        },
                        {
                            "key": "Stomach",
                            "relativeProbability": 3,
                            "data": ["Stomach"]
                        },
                        {
                            "key": "Chest",
                            "relativeProbability": 5,
                            "data": ["Chest"]
                        },
                        {
                            "key": "Arms",
                            "relativeProbability": 0.5,
                            "data": ["LeftArm", "RightArm"]
                        },
                        {
                            "key": "Legs",
                            "relativeProbability": 1,
                            "data": ["LeftLeg", "RightLeg"]
                        },
                    ],
                    "specificLocationProb": 0.25,
                    "distLocationBlacklist": ["laboratory", "factory4_day", "factory4_night"],
                    "distProb": 0.25,
                    "maxDist": 200,
                    "minDist": 20,
                    "maxKills": 15,
                    "minKills": 5
                }
            }
        },
    ]
};

// Request for dailies has been according to wiki:
// level 45+
// add reward randomistion:
// 20,000 to 80,000 exp
// 100,000 to 250,000 roubles
// 700 to 1750 euros if from peacekeeper
// 1 to 4 items
//
// level 21-45
// add reward randomistion:
// up to 20,000 exp
// up to 100,000 roubles
// up to 700 if from peacekeeper
// 1 to 4 items
//
// level 5-20
// add reward randomistion:
// up to 2000 exp
// up to 10,000 roubles
// up to 70 if from peacekeeper
// 1 to 2 items
//
// quest types:
// exit location
// extract between 1 and 5 times from location
//
// elimination PMC
// kill between 2-15 PMCs
// from a distance between 20-50 meters
// kill via damage from a particular body part
//
// elimination scav
// kill between 2-15 scavs
// from a distance between 20-50 meters
// kill via damage from a particular body part
//
// boss elimination
// any distance OR from a distance of more than 80
//
// find and transfer
// find and handover a random number of items
// items are random
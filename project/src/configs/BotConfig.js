"use strict";

module.exports = {
    "presetBatch": {
        "assault": 120,
        "bossBully": 1,
        "bossGluhar": 1,
        "bossKilla": 1,
        "bossKojaniy": 1,
        "bossSanitar": 1,
        "bossTagilla": 1,
        "bossTest": 40,
        "cursedAssault": 120,
        "followerBully": 4,
        "followerGluharAssault": 2,
        "followerGluharScout": 2,
        "followerGluharSecurity": 2,
        "followerGluharSnipe": 2,
        "followerKojaniy": 2,
        "followerSanitar": 2,
        "followerTagilla": 2,
        "followerTest": 4,
        "marksman": 30,
        "pmcBot": 120,
        "sectantPriest": 1,
        "sectantWarrior": 5,
        "gifter": 1,
        "test": 40,
        "exUsec": 15
    },
    "bosses": ["bossbully", "bossgluhar", "bosskilla", "bosskojaniy", "bosssanitar", "bosstagilla"],
    "durability":{ // Add custom bot types here, otherwise they will use the default values
        "default":{
            "armor":{
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 50,
                "highestMax": 100,
                "maxDelta": 10,
                "minDelta": 0
            }
        },
        "pmc": { // Sets bots that are designated PMCs by 'usecType' and 'bearType'
            "armor": {
                "lowestMaxPercent": 90,   // These two properties
                "highestMaxPercent": 100, // are only for PMCs
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 95,
                "highestMax": 100,
                "maxDelta": 5,
                "minDelta": 0
            }
        },
        "boss": { // Bosses are all grouped together
            "armor": {
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 80,
                "highestMax": 100,
                "maxDelta": 10,
                "minDelta": 0
            }
        },
        "follower": { // followers are all grouped together
            "armor": {
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 80,
                "highestMax": 100,
                "maxDelta": 10,
                "minDelta": 0
            }
        },
        "assault": {
            "armor": {
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 48,
                "highestMax": 70,
                "maxDelta": 10,
                "minDelta": 0
            }
        },
        "cursedassault": {
            "armor": {
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 50,
                "highestMax": 70,
                "maxDelta": 10,
                "minDelta": 0
            }
        },
        "marksman": {
            "armor": {
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 50,
                "highestMax": 70,
                "maxDelta": 10,
                "minDelta": 0
            }
        },
        "pmcbot":{
            "armor": {
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 80,
                "highestMax": 100,
                "maxDelta": 10,
                "minDelta": 0
            }
        },
        "exusec":{
            "armor": {
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 79,
                "highestMax": 100,
                "maxDelta": 10,
                "minDelta": 0
            }
        },
        "sectantpriest": {
            "armor": {
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 90,
                "highestMax": 100,
                "maxDelta": 10,
                "minDelta": 0
            }
        },
        "sectantwarrior": {
            "armor": {
                "maxDelta": 10,
                "minDelta": 0
            },
            "weapon": {
                "lowestMax": 90,
                "highestMax": 100,
                "maxDelta": 10,
                "minDelta": 0
            }
        }
    },
    "lootNValue": {
        "scav": 3,
        "pmc": 1.8
    },
    "pmc": {
        "dynamicLoot": {
            "whitelist": [
                ItemHelper.BASECLASS.Jewelry,
                ItemHelper.BASECLASS.Electronics,
                ItemHelper.BASECLASS.BuildingMaterial,
                ItemHelper.BASECLASS.Tool,
                ItemHelper.BASECLASS.HouseholdGoods,
                ItemHelper.BASECLASS.MedicalSupplies,
                ItemHelper.BASECLASS.Lubricant,
                ItemHelper.BASECLASS.Battery,
                ItemHelper.BASECLASS.Keycard,
                ItemHelper.BASECLASS.KeyMechanical,
                ItemHelper.BASECLASS.AssaultScope,
                ItemHelper.BASECLASS.ReflexSight,
                ItemHelper.BASECLASS.SpecialScope,
                ItemHelper.BASECLASS.OpticScope,
                ItemHelper.BASECLASS.TacticalCombo,
                ItemHelper.BASECLASS.Magazine,
                ItemHelper.BASECLASS.Knife,
                ItemHelper.BASECLASS.BarterItem,
                ItemHelper.BASECLASS.Silencer,
                ItemHelper.BASECLASS.Foregrip,
                ItemHelper.BASECLASS.Info,
                ItemHelper.BASECLASS.Food,
                ItemHelper.BASECLASS.Fuel,
                ItemHelper.BASECLASS.Drink,
                ItemHelper.BASECLASS.Drugs,
                ItemHelper.BASECLASS.Armor,
                ItemHelper.BASECLASS.Stimulator,
                ItemHelper.BASECLASS.AmmoBox,
                ItemHelper.BASECLASS.Ammo,
                ItemHelper.BASECLASS.Money,
                ItemHelper.BASECLASS.Other,
                ItemHelper.BASECLASS.MedKit,
                ItemHelper.BASECLASS.ThrowWeap
            ],
            "blacklist": [
                "5fca13ca637ee0341a484f46", // SJ9 TGLabs combat stimulant injector (Thermal Stim)
                "59f32c3b86f77472a31742f0", // usec dogtag
                "59f32bb586f774757e1e8442", // bear dogtag
                "617aa4dd8166f034d57de9c5", // M18 Smoke Grenade
                "5a2a57cfc4a2826c6e06d44a", // RDG-2B Smoke Grenade
                "619256e5f8af2c1a4e1f5d92", // M7290 Flash Bang Grenade
                "5a0c27731526d80618476ac4"  // Zarya Stun Grenade
            ],
            "spawnLimits": {
                "5c99f98d86f7745c314214b3": 1, // mechanical key
                "5c164d2286f774194c5e69fa": 1, // keycard
                "550aa4cd4bdc2dd8348b456c": 2, // silencer
                "55818add4bdc2d5b648b456f": 1, // assault scope
                "55818ad54bdc2ddc698b4569": 1, // reflex sight
                "55818aeb4bdc2ddc698b456a": 1, // special scopes (thermals etc)
                "55818ae44bdc2dde698b456c": 1, // optical scopes
                "55818af64bdc2d5b648b4570": 1, // foregrip
                "5448e54d4bdc2dcc718b4568": 1, // armor
                "5448f3a64bdc2d60728b456a": 2, // stims
                "5447e1d04bdc2dff2f8b4567": 1, // knife
                "5a341c4686f77469e155819e": 1, // face cover
                "55818b164bdc2ddc698b456c": 2, // tactical laser/light
                "5448bc234bdc2d3c308b4569": 2, // Magazine
                "543be5dd4bdc2deb348b4569": 2, // Money
                "543be5cb4bdc2deb348b4568": 2, // AmmoBox
                "5485a8684bdc2da71d8b4567": 2, // Ammo
                "5d650c3e815116009f6201d2": 2, // Fuel
                "5448f39d4bdc2d0a728b4568": 2, // Medkit
                "543be6564bdc2df4348b4568": 1  // Grenades
            },
            "moneyStackLimits": {
                "5449016a4bdc2d6f028b456f": 4000, // Rouble
                "5696686a4bdc2da3298b456a": 50, // USD
                "569668774bdc2da2298b4568": 50, // Euro
            }
        },
        "cartridgeBlacklist": [
            "56dff421d2720b5f5a8b4567", // 5.45x39mm sp
            "56dff216d2720bbd668b4568", // 5.45x39mm hp
            "56dff338d2720bbd668b4569", // 5.45x39mm prs
            "56dff4ecd2720b5f5a8b4568", // 5.45x39mm US

            "59e6918f86f7746c9f75e849", // 5.56x45mm hp
            "5c0d5ae286f7741e46554302", // 5.56x45mm warmageddon

            "5c0d56a986f774449d5de529", // 9x19mm rip
            "5efb0e16aeb21837e749c7ff", // 9x19mm quakemaker

            "5737218f245977612125ba51", // 9x18mm sp8
            "57372140245977611f70ee91", // 9x18mm sp7
            "57371aab2459775a77142f22", // 9x18mm pmm pstm
            "573719762459775a626ccbc1", // 9x18mm pmp

            "573601b42459776410737435", // 7.62x25mm lrn
            "573602322459776445391df1", // 7.62x25mm lrnpc

            "59e4d3d286f774176a36250a", // 7.62x39mm HP

            "5e023e88277cce2b522ff2b1", // 7.62x51mm ultra nosler

            "59e6658b86f77411d949b250", // .366 tkm

            "5c0d591486f7744c505b416f", // 12/70 rip
            "5d6e68d1a4b93622fe60e845", // 12/70 SuperFormance HP slug
            "5d6e6869a4b9361c140bcfde", // 12/70 Grizzly 40 slug

            "5e85a9f4add9fe03027d9bf1", // 23x75mm flashbang round

            "5cadf6e5ae921500113bb973", // 12.7x55mm PS12A
            "5cadf6ddae9215051e1c23b2", // 12.7x55mm PS12

            "6196365d58ef8c428c287da1", // .300 Blackout Whisper

            "5ba26812d4351e003201fef1", // 4.6x30mm action sx

            "5cc80f79e4a949033c7343b2" // 5.7x28mm SS198LF
        ],
        "difficulty": "AsOnline",
        "isUsec": 50,
        "chanceSameSideIsHostilePercent": 50,
        "usecType": "bosstest",
        "bearType": "test",
        "maxBackpackLootTotalRub": 150000,
        "maxPocketLootTotalRub": 50000,
        "maxVestLootTotalRub": 50000,
        "types": {
            "assault": 25,
            "cursedAssault": 25,
            "pmcBot": 25,
            "exUsec": 10
        }
    },
    "showTypeInNickname": false,
    "maxBotCap": 20
};
"use strict";

const _traders = {
    "mechanic": "5a7c2eca46aef81a7ca2145d",
    "ragman": "5ac3b934156ae10c4430e83c",
    "jaeger": "5c0647fdd443bc2504c2d371",
    "prapor": "54cb50c76803fa8b248b4571",
    "therapist": "54cb57776803fa99248b456e",
    "fence": "579dc571d53a0658a154fbec",
    "peacekeeper": "5935c25fb3acc3127c3d8cd9",
    "skier": "58330581ace78e27b8b10cee",
};

class TraderHelper
{
    static get TRADER()
    {
        return {
            "Prapor": "54cb50c76803fa8b248b4571",
            "Therapist": "54cb57776803fa99248b456e",
            "Fence": "579dc571d53a0658a154fbec",
            "Skier": "58330581ace78e27b8b10cee",
            "Peacekeeper": "5935c25fb3acc3127c3d8cd9",
            "Mechanic": "5a7c2eca46aef81a7ca2145d",
            "Ragman": "5ac3b934156ae10c4430e83c",
            "Jaeger": "5c0647fdd443bc2504c2d371"
        };
    }

    /**
     * Return the ID for a trader
     * @param {string} traderName
     * @returns string
     * @throws exception
     */
    static getTraderIdByName(traderName)
    {
        traderName = traderName.toLowerCase();
        if (!(traderName in _traders))
        {
            throw `Cannot get ID for ${traderName}`;
        }

        return _traders[traderName];
    }
}

module.exports = TraderHelper;
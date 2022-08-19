"use strict";

require("../Lib.js");

class LocaleService
{
    /**
     * Gets the locale key from the locale.json file
     * @returns locale e.g en/ge/cz/cn
     */
    static getDesiredLocale()
    {
        return LocaleConfig.desiredLocale.toLowerCase();
    }
}

module.exports = LocaleService;
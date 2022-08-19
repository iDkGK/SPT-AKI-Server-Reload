"use strict";

require("../Lib.js");

class ProbabilityHelper
{
    /**
     * Chance to roll a number out of 100
     * @param chance Percentage chance roll should success
     * @param scale scale of chance to allow support of numbers > 1-100
     * @returns true if success
     */
    static rollChance(chance, scale = 1)
    {
        return RandomUtil.getInt(1, 100 * scale) / (1 * scale) <= chance;
    }
}

module.exports = ProbabilityHelper;

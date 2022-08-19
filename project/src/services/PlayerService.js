"use strict";

require("../Lib.js");

class PlayerService
{
    /**
     * increases the profile skill and updates any output
     * @param {Object} pmcData
     * @param {Object} output
     * @param {String} skillName
     * @param {Number} amount
     */
    static incrementSkillLevel(pmcData, output, skillName, amount)
    {
        const profileSkill = pmcData.Skills.Common.find(skill => skill.Id === skillName);

        if (!amount || amount < 0)
        {
            Logger.error("increment skill with a negative amount");
            return;
        }

        profileSkill.Progress += amount;

        if (output)
        {
            const outputSkill = output.skills.Common.find(skill => skill.Id === skillName);
            outputSkill.Progress += amount;
        }
    }

    /**
     * @param {Object} pmcData
     * @returns number
     */
    static calculateLevel(pmcData)
    {
        let exp = 0;

        for (const level in DatabaseServer.getTables().globals.config.exp.level.exp_table)
        {
            if (pmcData.Info.Experience < exp)
            {
                break;
            }

            pmcData.Info.Level = parseInt(level);
            exp += DatabaseServer.getTables().globals.config.exp.level.exp_table[level].exp;
        }

        return pmcData.Info.Level;
    }
}

module.exports = PlayerService;
require("../Lib");

class PlayerController
{

    /**
     * increases the profile skill and updates any output
     * @param {Object} pmcData
     * @param {Object} output
     * @param {String} skill
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

        for (const level in DatabaseServer.tables.globals.config.exp.level.exp_table)
        {
            if (pmcData.Info.Experience < exp)
            {
                break;
            }

            pmcData.Info.Level = parseInt(level);
            exp += DatabaseServer.tables.globals.config.exp.level.exp_table[level].exp;
        }

        return pmcData.Info.Level;
    }

    /**
     * @returns number
     */
    static getRandomExperience()
    {
        let exp = 0;
        const expTable = DatabaseServer.tables.globals.config.exp.level.exp_table;

        // Get random level based on the exp table.
        const randomLevel = RandomUtil.getInt(0, expTable.length - 1) + 1;

        for (let i = 0; i < randomLevel; i++)
        {
            exp += expTable[i].exp;
        }

        // Sprinkle in some random exp within the level, unless we are at max level.
        if (randomLevel < expTable.length - 1)
        {
            exp += RandomUtil.getInt(0, expTable[randomLevel].exp - 1);
        }

        return exp;
    }

    /**
     * Made a 2d array table with 0 - free slot and 1 - used slot
     * @param {Object} pmcData
     * @param {string} sessionID
     * @returns Array
     */
    static getStashSlotMap(pmcData, sessionID)
    {
        const PlayerStashSize = InventoryHelper.getPlayerStashSize(sessionID);
        return ContainerHelper.getContainerMap(PlayerStashSize[0], PlayerStashSize[1], pmcData.Inventory.items, pmcData.Inventory.stash);
    }
}

module.exports = PlayerController;
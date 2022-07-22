require("../Lib.js");

class UtilityHelper
{
    static arrayIntersect(a, b)
    {
        return a.filter(x => b.includes(x));
    }
}

module.exports = UtilityHelper;
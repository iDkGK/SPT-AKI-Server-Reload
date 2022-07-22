"use strict";

require("../Lib.js");

class MathUtil
{
    /**
     * Helper to create the sum of all array elements
    * @param   {array}     values          The array with numbers of which to calculate the sum
    * @return  {number}                    sum(values)
    */
    static arraySum(values)
    {
        // sum with initial value being 0
        return values.reduce((sum, x) => sum + x, 0);
    }

    /**
     * Helper to create the cumulative sum of all array elements
     * arrayCumsum([1, 2, 3, 4]) = [1, 3, 6, 10]
     * @param   {array}     values          The array with numbers of which to calculate the cumulative sum
     * @return  {array}                     cumsum(values)
     */
    static arrayCumsum(values)
    {
        // curried function for cumulative sum: (cum, x) => cum += x
        // and 0 being the initial value for the map
        return values.map((cum => x => cum += x)(0));
    }

    /**
     * Helper to create the product of each element times factor
     * @param   {array}     values          The array of numbers which shall be multiplied by the factor
     * @return  {array}                     array times factor
     */
    static arrayProd(values, factor)
    {
        return values.map(x => x * factor);
    }

    /**
     * Helper to add a constant to all array elements
     * @param   {array}     values          The array of numbers to which the summand should be added
     * @return  {array}                     array plus summand
     */
    static arrayAdd(values, summand)
    {
        return values.map(x => x + summand);
    }

    /**
     * Map a value from an input range to an output range linearly
     *
     * Example:
     *  a_min = 0; a_max=1;
     *  b_min = 1; b_max=3;
     *  MathUtil.mapToRange(0.5, a_min, a_max, b_min, b_max) // returns 2
     *
     * @param   {number}    x               The value from input range to be mapped to output range
     * @param   {number}    minIn           min of input range
     * @param   {number}    maxIn           max of input range
     * @param   {number}    minOut          min of output range
     * @param   {number}    maxOut          max of outout range
     * @return  {number}                    the result of the mapping
     */
    static mapToRange(x, minIn, maxIn, minOut, maxOut)
    {
        const deltaIn = maxIn - minIn;
        const deltaOut = maxOut - minOut;

        const xScale = (x - minIn) / deltaIn;
        return Math.max(minOut, Math.min(maxOut, minOut + xScale * deltaOut));
    }

    /**
    * Linear interpolation
    * e.g. used to do a continuous integration for quest rewards which are defined for specific support centers of pmcLevel
    *
    * @param   {string}    xp              the point of x at which to interpolate
    * @param   {array}     x               support points in x (of same length as y)
    * @param   {array}     y               support points in y (of same length as x)
    * @return  {number}                    y(xp)
    */
    static Interp1(xp, x, y)
    {
        if (xp > x[x.length - 1])
        {
            return y[y.length - 1];
        }
        else if (xp < x[0])
        {
            return y[0];
        }
        else
        {
            for (let i = 0; i < x.length - 1; i++)
            {
                if (xp >= x[i] && xp <= x[i + 1])
                {
                    return y[i] + (xp - x[i]) * (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
                }
            }
        }
    }
}



module.exports = MathUtil;
"use strict";

require("../Lib.js");

class RandomUtil
{
    /**
     * Array of ProbabilityObjectArray which allow to randomly draw of the contained objects
     * based on the relative probability of each of its elements.
     * The probabilities of the contained element is not required to be normalized.
     *
     * Example:
     *   po = new ProbabilityObjectArray(
     *          new ProbabilityObject("a", 5),
     *          new ProbabilityObject("b", 1),
     *          new ProbabilityObject("c", 1)
     *   );
     *   res = po.draw(10000);
     *   // count the elements which should be distributed according to the relative probabilities
     *   res.filter(x => x==="b").reduce((sum, x) => sum + 1 , 0)
     */
    static ProbabilityObjectArray = class ProbabilityObjectArray extends Array
    {
        constructor(...items)
        {
            super();
            this.push(...items);
        }

        filter(callbackfn)
        {
            return new ProbabilityObjectArray(...super.filter(callbackfn));
        }

        /**
         * Calculates the normalized cumulative probability of the ProbabilityObjectArray's elements normalized to 1
         * @param       {array}                         probValues              The relative probability values of which to calculate the normalized cumulative sum
         * @returns     {array}                                                 Cumulative Sum normalized to 1
         */
        cumulativeProbability(probValues)
        {
            const sum = MathUtil.arraySum(probValues);
            let probCumsum = MathUtil.arrayCumsum(probValues);
            probCumsum = MathUtil.arrayProd(probCumsum, 1 / sum);
            return probCumsum;
        }

        /**
         * Clone this ProbabilitObjectArray
         * @returns     {ProbabilityObjectArray}                                Deep Copy of this ProbabilityObjectArray
         */
        clone()
        {
            const clone = JSON.parse(JSON.stringify(this));
            const probabliltyObjects = new ProbabilityObjectArray();
            for (const ci of clone)
            {
                probabliltyObjects.push(
                    new RandomUtil.ProbabilityObject(
                        ci.key,
                        ci.relativeProbability,
                        ci.data
                    )
                );
            }
            return probabliltyObjects;
        }

        /**
         * Drop an element from the ProbabilityObjectArray
         *
         * @param       {string}                        key                     The key of the element to drop
         * @returns     {ProbabilityObjectArray}                                ProbabilityObjectArray without the dropped element
         */
        drop(key)
        {
            return this.filter(r => r.key !== key);
        }

        /**
         * Return the data field of a element of the ProbabilityObjectArray
         * @param       {string}                        key                     The key of the element whose data shall be retrieved
         * @returns     {object}                                                The data object
         */
        data(key)
        {
            return this.filter(r => r.key === key)[0].data;
        }

        /**
         * Get the relative probability of an element by its key
         *
         * Example:
         *  po = new ProbabilityObjectArray(new ProbabilityObject("a", 5), new ProbabilityObject("b", 1))
         *  po.maxProbability() // returns 5
         *
         * @param       {string}                        key                     The key of the element whose relative probability shall be retrieved
         * @return      {number}                                                The relative probability
         */
        probability(key)
        {
            return this.filter(r => r.key === key)[0].relativeProbability;
        }

        /**
         * Get the maximum relative probability out of a ProbabilityObjectArray
         *
         * Example:
         *  po = new ProbabilityObjectArray(new ProbabilityObject("a", 5), new ProbabilityObject("b", 1))
         *  po.maxProbability() // returns 5
         *
         * @return      {number}                                                the maximum value of all relative probabilities in this ProbabilityObjectArray
         */
        maxProbability()
        {
            return Math.max(...this.map(x => x.relativeProbability));
        }

        /**
         * Get the minimum relative probability out of a ProbabilityObjectArray
         *
         * Example:
         *  po = new ProbabilityObjectArray(new ProbabilityObject("a", 5), new ProbabilityObject("b", 1))
         *  po.minProbability() // returns 1
         *
         * @return      {number}                                                the minimum value of all relative probabilities in this ProbabilityObjectArray
         */
        minProbability()
        {
            return Math.min(...this.map(x => x.relativeProbability));
        }

        /**
         * Draw random element of the ProbabilityObject N times to return an array of N keys.
         * Drawing can be with or without replacement
         *
         * @param       {integer}                       count                       The number of times we want to draw
         * @param       {boolean}                       replacement             Draw with or without replacement from the input dict
         * @param       {array}                         locklist                list keys which shall be replaced even if drawing without replacement
         * @return      {array}                                                 Array consisting of N random keys for this ProbabilityObjectArray
         */
        draw(count = 1, replacement = true, locklist = [])
        {
            const probArray = this.map(x => x.relativeProbability);
            const keyArray = this.map(x => x.key);
            let probCumsum = this.cumulativeProbability(probArray);

            const randomKeys = [];
            for (let i = 0; i < count; i++)
            {
                const rand = Math.random();
                const idx = probCumsum.findIndex(x => x > rand);
                // we cannot put Math.random() directly in the findIndex because then it draws anew for each of its iteration
                if (replacement || locklist.includes(keyArray[idx]))
                {
                    randomKeys.push(keyArray[idx]);
                }
                else
                {
                    // we draw without replacement -> remove the key and its probability from array
                    const key = keyArray.splice(idx, 1)[0];
                    probArray.splice(idx, 1);
                    randomKeys.push(key);
                    probCumsum = this.cumulativeProbability(probArray);
                    // if we draw without replacement and the ProbabilityObjectArray is exhausted we need to break
                    if (keyArray.length < 1)
                    {
                        break;
                    }
                }
            }
            return randomKeys;
        }
    };

    /**
     * A ProbabilityObject which is use as an element to the ProbabilityObjectArray array
     * It contains a key, the relative probability as well as optional data.
     */
    static ProbabilityObject = class ProbabilityObject
    {
        /**
         * Constructor for the ProbabilityObject
         * @param       {string}                        key                         The key of the element
         * @param       {number}                        relativeProbability         The relative probability of this element
         * @param       {any}                           data                        Optional data attached to the element
         */
        constructor(key, relativeProbability, data = null)
        {
            this.key = key;
            this.relativeProbability = relativeProbability;
            this.data = data;
        }
    };

    static getInt(min, max)
    {
        min = Math.ceil(min);
        max = Math.floor(max);
        return max > min
            ? Math.floor(Math.random() * (max - min + 1) + min)
            : min;
    }

    static getIntEx(max)
    {
        return max > 1 ? Math.floor(Math.random() * (max - 2) + 1) : 1;
    }

    static getFloat(min, max)
    {
        return Math.random() * (max - min) + min;
    }

    static getBool()
    {
        return Math.random() < 0.5;
    }

    // Its better to keep this method separated from getArrayValue so we can use generic inferance on getArrayValue
    static getStringArrayValue(arr)
    {
        return arr[RandomUtil.getInt(0, arr.length - 1)];
    }

    static getArrayValue(arr)
    {
        return arr[RandomUtil.getInt(0, arr.length - 1)];
    }

    static getKey(node)
    {
        return RandomUtil.getArrayValue(Object.keys(node));
    }

    static getKeyValue(node)
    {
        return node[RandomUtil.getKey(node)];
    }

    /**
     * Draw from normal distribution
     * @param   {number}    mu      Mean of the normal distribution
     * @param   {number}    sigma   Standard deviation of the normal distribution
     * @returns {number}            The value drawn
     */
    static randn(mu, sigma)
    {
        let u = 0;
        let v = 0;
        while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();
        const w = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return mu + w * sigma;
    }

    /**
     * Draw Random integer low inclusive, high exclusive
     * if high is not set we draw from 0 to low (exclusive)
     * @param   {integer}   low     Lower bound inclusive, when high is not set, this is high
     * @param   {integer}   high    Higher bound exclusive
     * @returns {integer}           The random integer in [low, high)
     */
    static randInt(low, high)
    {
        if (high)
        {
            return low + Math.floor(Math.random() * (high - low));
        }
        else
        {
            return Math.floor(Math.random() * low);
        }
    }

    /**
     * Draw a random element of the provided list N times to return an array of N random elements
     * Drawing can be with or without replacement
     * @param   {array}     list            The array we want to draw randomly from
     * @param   {integer}   count               The number of times we want to draw
     * @param   {boolean}   replacement     Draw with ot without replacement from the input array
     * @return  {array}                     Array consisting of N random elements
     */
    static drawRandomFromList(list, count = 1, replacement = true)
    {
        if (!replacement)
        {
            list = JsonUtil.clone(list);
        }

        const results = [];
        for (let i = 0; i < count; i++)
        {
            const randomIndex = RandomUtil.randInt(list.length);
            if (replacement)
            {
                results.push(list[randomIndex]);
            }
            else
            {
                results.push(list.splice(randomIndex, 1)[0]);
            }
        }
        return results;
    }

    /**
     * Draw a random (top level) element of the provided dictionary N times to return an array of N random dictionary keys
     * Drawing can be with or without replacement
     * @param   {object}    dict            The dictionary we want to draw randomly from
     * @param   {integer}   count               The number of times we want to draw
     * @param   {boolean}   replacement     Draw with ot without replacement from the input dict
     * @return  {array}                     Array consisting of N random keys of the dictionary
     */
    static drawRandomFromDict(dict, count = 1, replacement = true)
    {
        const keys = Object.keys(dict);
        const randomKeys = RandomUtil.drawRandomFromList(
            keys,
            count,
            replacement
        );
        return randomKeys;
    }

    static getBiasedRandomNumber(min, max, shift, n)
    {
        /* To whoever tries to make sense of this, please forgive me - I tried my best at explaining what goes on here.
         * This function generates a random number based on a gaussian distribution with an option to add a bias via shifting.
         *
         * Here's an example graph of how the probabilities can be distributed:
         * https://www.boost.org/doc/libs/1_49_0/libs/math/doc/sf_and_dist/graphs/normal_pdf.png
         * Our parameter 'n' is sort of like σ (sigma) in the example graph.
         *
         * An 'n' of 1 means all values are equally likely. Increasing 'n' causes numbers near the edge to become less likely.
         * By setting 'shift' to whatever 'max' is, we can make values near 'min' very likely, while values near 'max' become extremely unlikely.
         *
         * Here's a place where you can play around with the 'n' and 'shift' values to see how the distribution changes:
         * http://jsfiddle.net/e08cumyx/ */

        if (max < min)
        {
            throw {
                name: "Invalid arguments",
                message: `Bounded random number generation max is smaller than min (${max} < ${min})`,
            };
        }

        if (n < 1)
        {
            throw {
                name: "Invalid argument",
                message: `'n' must be 1 or greater (received ${n})`,
            };
        }

        if (min === max)
        {
            return min;
        }

        if (shift > max - min)
        {
            /* If a rolled number is out of bounds (due to bias being applied), we simply roll it again.
             * As the shifting increases, the chance of rolling a number within bounds decreases.
             * A shift that is equal to the available range only has a 50% chance of rolling correctly, theoretically halving performance.
             * Shifting even further drops the success chance very rapidly - so we want to warn against that */

            Logger.warning(
                "Bias shift for random number generation is greater than the range of available numbers.\nThis can have a very severe performance impact!"
            );
            Logger.info(`min -> ${min}; max -> ${max}; shift -> ${shift}`);
        }

        const gaussianRandom = n =>
        {
            let rand = 0;

            for (let i = 0; i < n; i += 1)
            {
                rand += Math.random();
            }

            return rand / n;
        };

        const boundedGaussian = (start, end, n) =>
        {
            return Math.round(start + gaussianRandom(n) * (end - start + 1));
        };

        const biasedMin = shift >= 0 ? min - shift : min;
        const biasedMax = shift < 0 ? max + shift : max;

        let num;
        do
        {
            num = boundedGaussian(biasedMin, biasedMax, n);
        } while (num < min || num > max);

        return num;
    }
}

module.exports = RandomUtil;

"use strict";

require("../Lib.js");

class RagfairCategoriesService
{
    static categories = {};

    /**
     * Get all flea categories and their count of offers
     * @returns item categories and count
     */
    static getAllCategories()
    {
        return RagfairCategoriesService.categories;
    }

    /**
      * With the supplied items, get custom categories
      * @returns a custom list of categories
      */
    static getBespokeCategories(offers)
    {
        return RagfairCategoriesService.processOffersIntoCategories(offers);
    }

    /**
      * Take an array of ragfair offers and create a dictionary of items with thier corrisponding offer count
      * @param offers ragfair offers
      * @returns categories and count
      */
    static processOffersIntoCategories(offers)
    {
        const result = {};
        for (const offer of offers)
        {
            RagfairCategoriesService.addOrIncrementCategory(offer, result);
        }

        return result;
    }

    /**
      * Increment or decrement a category array
      * @param offer offer to process
      * @param categories categories to update
      * @param increment should item be incremented or decremented
      */
    static addOrIncrementCategory(offer, categories, increment = true)
    {

        const itemId = offer.items[0]._tpl;
        if (increment)
        {
            if (!categories[itemId])
            {
                categories[itemId] = 1;
            }
            else
            {
                categories[itemId]++;
            }
        }
        else
        {

            // No category, no work to do
            if (!categories[itemId])
            {
                return;
            }

            // Key exists, decrement
            if (categories[itemId])
            {
                categories[itemId]--;
            }

            // remove category entirely as its 0 or less
            if (categories[itemId] < 1)
            {
                delete categories[itemId];
            }
        }
    }

    /**
      * Increase category count by 1
      * @param offer
      */
    static incrementCategory(offer)
    {
        RagfairCategoriesService.addOrIncrementCategory(offer, RagfairCategoriesService.categories);
        RagfairCategoriesService.categories[offer.items[0]._tpl]++;
    }

    /**
      * Reduce category count by 1
      * @param offer
      */
    static decrementCategory(offer)
    {
        RagfairCategoriesService.addOrIncrementCategory(offer, RagfairCategoriesService.categories, false);
        RagfairCategoriesService.categories[offer.items[0]._tpl]--;
    }
}

module.exports = RagfairCategoriesService;
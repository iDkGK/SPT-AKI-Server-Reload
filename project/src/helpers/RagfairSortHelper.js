"use strict";

require("../Lib.js");

class RagfairSortHelper
{
    static sortOffers(offers, type, direction = 0)
    {
        // Sort results
        switch (type)
        {
            case 0: // ID
                offers.sort(RagfairSortHelper.sortOffersByID);
                break;

            case 3: // Merchant (rating)
                offers.sort(RagfairSortHelper.sortOffersByRating);
                break;

            case 4: // Offer (title)
                offers.sort((a, b) => RagfairSortHelper.sortOffersByName(a, b));
                break;

            case 5: // Price
                offers.sort(RagfairSortHelper.sortOffersByPrice);
                break;

            case 6: // Expires in
                offers.sort(RagfairSortHelper.sortOffersByExpiry);
                break;
        }

        // 0=ASC 1=DESC
        if (direction === 1)
        {
            offers.reverse();
        }

        return offers;
    }

    static sortOffersByID(a, b)
    {
        return a.intId - b.intId;
    }

    static sortOffersByRating(a, b)
    {
        return a.user.rating - b.user.rating;
    }

    static sortOffersByName(a, b)
    {
        const locale =
            DatabaseServer.getTables().locales.global[
                LocaleService.getDesiredLocale()
            ];

        const ia = a.items[0]._tpl;
        const ib = b.items[0]._tpl;
        const aa = locale.templates[ia].Name || ia;
        const bb = locale.templates[ib].Name || ib;

        return aa < bb ? -1 : aa > bb ? 1 : 0;
    }

    static sortOffersByPrice(a, b)
    {
        return a.requirementsCost - b.requirementsCost;
    }

    static sortOffersByExpiry(a, b)
    {
        return a.endTime - b.endTime;
    }
}

module.exports = RagfairSortHelper;

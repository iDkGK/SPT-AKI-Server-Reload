"use strict";

require("../Lib.js");

class WishlistCallbacks
{
    static addToWishlist(pmcData, body, sessionID)
    {
        return WishlistController.addToWishList(pmcData, body, sessionID);
    }

    static removeFromWishlist(pmcData, body, sessionID)
    {
        return WishlistController.removeFromWishList(pmcData, body, sessionID);
    }
}

module.exports = WishlistCallbacks;

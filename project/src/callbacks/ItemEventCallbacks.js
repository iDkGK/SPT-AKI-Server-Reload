"use strict";

require("../Lib.js");

class ItemEventCallbacks
{
    static handleEvents(url, info, sessionID)
    {
        return HttpResponse.getBody(ItemEventRouter.handleEvents(info, sessionID));
    }
}

module.exports = ItemEventCallbacks;

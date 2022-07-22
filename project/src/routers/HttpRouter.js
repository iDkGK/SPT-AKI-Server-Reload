"use strict";

require("../Lib.js");

class HttpRouter
{
    static onStaticRoute = require("../bindings/StaticRoutes");
    static onDynamicRoute = require("../bindings/DynamicRoutes");

    static getResponse(req, info, sessionID)
    {
        let output = "";
        let url = req.url;

        // remove retry from url
        if (url.includes("?retry="))
        {
            url = url.split("?retry=")[0];
        }

        if (HttpRouter.onStaticRoute[url])
        {
            // static route found
            for (const callback in HttpRouter.onStaticRoute[url])
            {
                output = HttpRouter.onStaticRoute[url][callback](url, info, sessionID, output);
            }
        }
        else
        {
            for (const route in HttpRouter.onDynamicRoute)
            {
                if (!url.includes(route))
                {
                    // not the route we look for
                    continue;
                }

                // dynamic route found
                for (const callback in HttpRouter.onDynamicRoute[route])
                {
                    output = HttpRouter.onDynamicRoute[route][callback](url, info, sessionID, output);
                }
            }
        }

        // TODO: Temporary hack to change ItemEventRouter response sessionID binding to what client expects
        if (output.includes("\"profileChanges\":{"))
        {
            output = output.replace(sessionID, `pmc${sessionID}`);
        }

        return output;
    }
}

module.exports = HttpRouter;

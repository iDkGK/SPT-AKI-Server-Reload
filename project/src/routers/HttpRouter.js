"use strict";

require("../Lib.js");

class ResponseWrapper
{
    output = "";

    constructor()
    {}
}

class HttpRouter
{
    static get onStaticRoute()
    {
        return require("../bindings/StaticRoutes");
    }

    static get onDynamicRoute()
    {
        return require("../bindings/DynamicRoutes");
    }

    static getResponse(req, info, sessionID)
    {
        const wrapper = new ResponseWrapper("");
        let url = req.url;

        // remove retry from url
        if (url.includes("?retry="))
        {
            url = url.split("?retry=")[0];
        }
        const handled = HttpRouter.handleRoute(
            url,
            info,
            sessionID,
            wrapper,
            false
        );
        if (!handled)
        {
            HttpRouter.handleRoute(url, info, sessionID, wrapper, true);
        }

        // TODO: Temporary hack to change ItemEventRouter response sessionID binding to what client expects
        if (wrapper.output.includes("\"profileChanges\":{"))
        {
            wrapper.output = wrapper.output.replace(
                sessionID,
                `pmc${sessionID}`
            );
        }

        return wrapper.output;
    }

    static handleRoute(url, info, sessionID, wrapper, dynamic)
    {
        let matched = false;
        if (dynamic)
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
                    wrapper.output = HttpRouter.onDynamicRoute[route][callback](
                        url,
                        info,
                        sessionID,
                        wrapper.output
                    );
                }
                matched = true;
            }
        }
        else
        {
            // static route found
            for (const callback in HttpRouter.onStaticRoute[url])
            {
                wrapper.output = HttpRouter.onStaticRoute[url][callback](
                    url,
                    info,
                    sessionID,
                    wrapper.output
                );
                matched = true;
            }
        }
        return matched;
    }
}

module.exports = HttpRouter;

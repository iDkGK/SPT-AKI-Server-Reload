"use strict";

require("../Lib.js");

class ImageRouteService
{
    static routes = {};

    static addRoute(urlKey, route)
    {
        ImageRouteService.routes[urlKey] = route;
    }

    static getByKey(urlKey)
    {
        return ImageRouteService.routes[urlKey];
    }

    static existsByKey(urlKey)
    {
        return (ImageRouteService.routes[urlKey] !== undefined);
    }
}

module.exports = ImageRouteService;
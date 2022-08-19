"use strict";

require("../Lib.js");

class WeatherCallbacks
{
    static getWeather(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(WeatherController.generate());
    }
}

module.exports = WeatherCallbacks;

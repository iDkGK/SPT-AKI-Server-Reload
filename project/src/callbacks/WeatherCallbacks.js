"use strict";

require("../Lib.js");

class WeatherCallbacks
{
    static getWeather(url, info, sessionID)
    {
        return HttpResponse.getBody(WeatherController.generate());
    }
}

module.exports = WeatherCallbacks;

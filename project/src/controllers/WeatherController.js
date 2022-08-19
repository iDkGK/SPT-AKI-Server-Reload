"use strict";

require("../Lib.js");

class WeatherController
{
    static generate()
    {
        let result = {
            acceleration: 0,
            time: "",
            date: "",
            weather: {
                pressure: 0,
                temp: 0,
                fog: "",
                rain_intensity: 0,
                rain: 0,
                wind_gustiness: 0,
                wind_direction: 0,
                wind_speed: 0,
                cloud: 0,
                time: "",
                date: "",
                timestamp: 0,
            },
        };

        result = WeatherGenerator.calculateTime(result);
        result = WeatherGenerator.generateWeather(result);

        return result;
    }
}

module.exports = WeatherController;

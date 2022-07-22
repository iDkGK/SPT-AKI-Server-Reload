"use strict";

require("../Lib.js");

class WeatherController
{
    static generate()
    {
        let result = { "weather": {} };

        result = WeatherController.calculateTime(result);
        result = WeatherController.generateWeather(result);

        return result;
    }

    static calculateTime(data)
    {
        // get time acceleration
        const deltaSeconds = Math.floor(process.uptime()) * WeatherConfig.acceleration;
        const computedDate = new Date();

        computedDate.setSeconds(computedDate.getSeconds() + deltaSeconds);

        // assign time
        const time = TimeUtil.formatTime(computedDate).replace("-", ":").replace("-", ":");
        const date = TimeUtil.formatDate(computedDate);
        const datetime = `${date} ${time}`;

        data.weather.timestamp = Math.floor(computedDate.getTime() / 1000);
        data.weather.date = date;
        data.weather.time = datetime;
        data.date = date;
        data.time = time;
        data.acceleration = WeatherConfig.acceleration;

        return data;
    }

    static generateWeather(data)
    {
        const enableRain = RandomUtil.getBool();
        const enableFog = RandomUtil.getBool();

        data.weather.cloud = WeatherController.getRandomFloat("clouds");
        data.weather.wind_speed = WeatherController.getRandomInt("windSpeed");
        data.weather.wind_direction = WeatherController.getRandomInt("windDirection");
        data.weather.wind_gustiness = WeatherController.getRandomFloat("windGustiness");
        data.weather.rain = (enableRain) ? WeatherController.getRandomInt("rain") : 0;
        data.weather.rain_intensity = (enableRain) ? WeatherController.getRandomFloat("rainIntensity") : 0;
        data.weather.fog = (enableFog) ? WeatherController.getRandomFloat("fog") : 0;
        data.weather.temp = WeatherController.getRandomInt("temp");
        data.weather.pressure = WeatherController.getRandomInt("pressure");

        return data;
    }

    static getRandomFloat(node)
    {
        return parseFloat(RandomUtil.getFloat(WeatherConfig.weather[node].min,
            WeatherConfig.weather[node].max).toPrecision(3));
    }

    static getRandomInt(node)
    {
        return RandomUtil.getInt(WeatherConfig.weather[node].min,
            WeatherConfig.weather[node].max);
    }
}

module.exports = WeatherController;

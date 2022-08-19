"use strict";

require("../Lib.js");

class WeatherGenerator
{
    static calculateTime(data)
    {
        const computedDate = new Date();
        const normalTime = WeatherGenerator.getNormalTime(computedDate);
        const formattedDate = TimeUtil.formatDate(computedDate);
        const datetime = `${formattedDate} ${normalTime}`;

        data.weather.timestamp = Math.floor(computedDate.getTime() / 1000);
        data.weather.date = formattedDate;
        data.weather.time = datetime;

        data.date = formattedDate;
        data.time = WeatherGenerator.getAcceleratedTime(computedDate);
        data.acceleration = WeatherConfig.acceleration;

        return data;
    }

    /**
     * Get server uptime seconds multiplied by a multiplier and add to current time as seconds
     * Format to BSGs requirements
     * @param computedDate current date
     * @returns formatted time
     */
    static getAcceleratedTime(computedDate)
    {
        const deltaSeconds =
            Math.floor(process.uptime()) * WeatherConfig.acceleration;

        computedDate.setSeconds(computedDate.getSeconds() + deltaSeconds);
        return TimeUtil.formatTime(computedDate)
            .replace("-", ":")
            .replace("-", ":");
    }

    /**
     * Get current time formatted to fit BSGs requirement
     * @param computedDate
     * @returns
     */
    static getNormalTime(computedDate)
    {
        return TimeUtil.formatTime(computedDate)
            .replace("-", ":")
            .replace("-", ":");
    }

    static generateWeather(data)
    {
        data.weather.cloud = WeatherGenerator.getRandomFloat("clouds");
        data.weather.wind_speed = WeatherGenerator.getRandomFloat("windSpeed");
        data.weather.wind_direction =
            WeatherGenerator.getRandomInt("windDirection");
        data.weather.wind_gustiness =
            WeatherGenerator.getRandomFloat("windGustiness");
        data.weather.rain = WeatherGenerator.getWeightedRain();
        data.weather.rain_intensity =
            data.weather.rain > 1
                ? WeatherGenerator.getRandomFloat("rainIntensity")
                : 0;
        data.weather.fog = WeatherGenerator.getWeightedFog();
        data.weather.temp = WeatherGenerator.getRandomFloat("temp");
        data.weather.pressure = WeatherGenerator.getRandomFloat("pressure");

        return data;
    }

    static getWeightedFog()
    {
        const fogValues = ["0.002", "0.006", "0.008", "0.012", "0.087"];
        const weightValues = [100, 40, 25, 25, 5];
        return WeightedRandomHelper.weightedRandom(fogValues, weightValues)
            .item;
    }

    static getWeightedRain()
    {
        const rainValues = [1, 2, 3];
        const weightValues = [100, 10, 5];
        return WeightedRandomHelper.weightedRandom(rainValues, weightValues)
            .item;
    }

    static getRandomFloat(node)
    {
        return parseFloat(
            RandomUtil.getFloat(
                WeatherConfig.weather[node].min,
                WeatherConfig.weather[node].max
            ).toPrecision(3)
        );
    }

    static getRandomInt(node)
    {
        return RandomUtil.getInt(
            WeatherConfig.weather[node].min,
            WeatherConfig.weather[node].max
        );
    }
}

module.exports = WeatherGenerator;

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

        result = WeatherController.calculateTime(result);
        result = WeatherController.generateWeather(result);

        return result;
    }

    static calculateTime(data)
    {
        // get time acceleration
        const deltaSeconds =
            Math.floor(process.uptime()) * WeatherConfig.acceleration;
        const computedDate = new Date();

        computedDate.setSeconds(computedDate.getSeconds() + deltaSeconds);

        // assign time
        const time = TimeUtil.formatTime(computedDate)
            .replace("-", ":")
            .replace("-", ":");
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
        data.weather.cloud = WeatherController.getRandomFloat("clouds");
        data.weather.wind_speed = WeatherController.getRandomFloat("windSpeed");
        data.weather.wind_direction =
            WeatherController.getRandomInt("windDirection");
        data.weather.wind_gustiness =
            WeatherController.getRandomFloat("windGustiness");
        data.weather.rain = WeatherController.getWeightedRain();
        data.weather.rain_intensity =
            data.weather.rain > 1
                ? WeatherController.getRandomFloat("rainIntensity")
                : 0;
        data.weather.fog = WeatherController.getWeightedFog();
        data.weather.temp = WeatherController.getRandomFloat("temp");
        data.weather.pressure = WeatherController.getRandomFloat("pressure");

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

module.exports = WeatherController;

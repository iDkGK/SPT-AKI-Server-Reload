"use strict";

require("../Lib.js");

class TimeUtil
{
    static get oneHourAsSeconds()
    {
        return 3600;
    }

    static formatTime(date)
    {
        const hours = `0${date.getHours()}`.substr(-2);
        const minutes = `0${date.getMinutes()}`.substr(-2);
        const seconds = `0${date.getSeconds()}`.substr(-2);
        return `${hours}-${minutes}-${seconds}`;
    }

    static formatDate(date)
    {
        const day = `0${date.getDate()}`.substr(-2);
        const month = `0${date.getMonth() + 1}`.substr(-2);
        return `${date.getFullYear()}-${month}-${day}`;
    }

    static getDate()
    {
        return TimeUtil.formatDate(new Date());
    }

    static getTime()
    {
        return TimeUtil.formatTime(new Date());
    }

    /**
     * Get timestamp in seconds
     * @returns
     */
    static getTimestamp()
    {
        return Math.floor(new Date().getTime() / 1000);
    }

    /**
     * mail in eft requires time be in a specific format
     * @returns current time in format: 00:00 (hh:mm)
     */
    static getTimeMailFormat()
    {
        const date = new Date();
        const hours = `0${date.getHours()}`.substr(-2);
        const minutes = `0${date.getMinutes()}`.substr(-2);
        return `${hours}:${minutes}`;
    }

    /**
     * Mail in eft requires date be in a specific format
     * @returns current date in format: 00.00.0000 (dd.mm.yyyy)
     */
    static getDateMailFormat()
    {
        const date = new Date();
        const day = `0${date.getDate()}`.substr(-2);
        const month = `0${date.getMonth() + 1}`.substr(-2);
        return `${day}.${month}.${date.getFullYear()}`;
    }

    /**
     * Convert hours into seconds
     * @param hours hours to convert to seconds
     * @returns number
     */
    static getHoursAsSeconds(hours)
    {
        return hours * 3600;
    }
}

module.exports = TimeUtil;

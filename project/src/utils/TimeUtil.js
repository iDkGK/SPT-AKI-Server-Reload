"use strict";

require("../Lib.js");

class TimeUtil
{
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
        return this.formatDate(new Date());
    }

    static getTime()
    {
        return this.formatTime(new Date());
    }

    static getTimestamp()
    {
        return Math.floor(new Date().getTime() / 1000);
    }
}

module.exports = TimeUtil;

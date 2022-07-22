"use strict";

require("../Lib.js");

const util = require("util");

class Logger
{
    static showDebugInConsole = false;
    static filepath = "user/logs/server.log";
    static colors = {
        "front": {
            "black": "\x1b[30m",
            "red": "\x1b[31m",
            "green": "\x1b[32m",
            "yellow": "\x1b[33m",
            "blue": "\x1b[34m",
            "magenta": "\x1b[35m",
            "cyan": "\x1b[36m",
            "white": "\x1b[37m"
        },
        "back": {
            "black": "\x1b[40m",
            "red": "\x1b[41m",
            "green": "\x1b[42m",
            "yellow": "\x1b[43m",
            "blue": "\x1b[44m",
            "magenta": "\x1b[45m",
            "cyan": "\x1b[46m",
            "white": "\x1b[47m"
        }
    };

    static initialize()
    {
        Logger.showDebugInConsole = globalThis.G_DEBUG_CONFIGURATION;

        if (VFS.exists(Logger.filepath))
        {
            VFS.writeFile(Logger.filepath, "");
        }

        process.on("uncaughtException", (error, promise) =>
        {
            Logger.error("Trace:");
            Logger.log(error);
        });
    }

    static writeToLogFile(data)
    {
        VFS.writeFile(Logger.filepath, `${data}\n`, true);
    }

    static log(data, front = "", back = "")
    {
        // set colors
        const colors = `${(Logger.colors.front[front] || "")}${Logger.colors.back[back] || ""}`;

        // show logged message
        if (colors)
        {
            console.log(`${colors}${data}\x1b[0m`);
        }
        else
        {
            console.log(data);
        }

        // save logged message
        Logger.writeToLogFile(util.format(data));
    }

    static error(data)
    {
        Logger.log(`[ERROR] ${data}`, "white", "red");
    }

    static warning(data)
    {
        Logger.log(`[WARNING] ${data}`, "black", "yellow");
    }

    static success(data)
    {
        Logger.log(`[SUCCESS] ${data}`, "white", "green");
    }

    static info(data)
    {
        Logger.log(`[INFO] ${data}`, "cyan", "black");
    }

    static debug(data, isError = false)
    {
        if (Logger.showDebugInConsole)
        {
            Logger.log(`[DEBUG] ${data}`, (isError) ? "red" : "green", "black");
        }
        else
        {
            Logger.writeToLogFile(util.format(`[DEBUG] ${data}`));
        }
    }

}

module.exports = Logger;

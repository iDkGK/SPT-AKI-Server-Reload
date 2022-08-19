"use strict";

require("../Lib.js");

const fs = require("fs");
const util = require("util");
const winston = require("winston");
const dailyrotatefile = require("winston-daily-rotate-file");

class Logger
{
    static showDebugInConsole = false;

    static get folderPath()
    {
        return "./user/logs/";
    }

    static get file()
    {
        return "server-%DATE%.log";
    }

    static get filePath()
    {
        return `${Logger.folderPath}${Logger.file}`;
    }

    static get logLevels()
    {
        return {
            levels: {
                error: 0,
                warn: 1,
                succ: 2,
                info: 3,
                custom: 4,
                debug: 5,
            },
            colors: {
                error: "red",
                warn: "yellow",
                succ: "green",
                info: "white",
                custom: "black",
                debug: "gray",
            },
            bgColors: {
                default: "",
                blackBG: "blackBG",
                redBG: "redBG",
                greenBG: "greenBG",
                yellowBG: "yellowBG",
                blueBG: "blueBG",
                magentaBG: "magentaBG",
                cyanBG: "cyanBG",
                whiteBG: "whiteBG",
            },
        };
    }

    static get writeFilePromisify()
    {
        return promisify(fs.writeFile);
    }

    static logger = winston.createLogger({
        levels: Logger.logLevels.levels,
        transports: [
            new dailyrotatefile({
                level: "debug",
                filename: Logger.filePath,
                datePattern: "YYYY-MM-DD-HH",
                zippedArchive: true,
                maxSize: "5m",
                maxFiles: "14d",
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.align(),
                    winston.format.json(),
                    winston.format.printf(({ timestamp, level, message }) =>
                    {
                        return `[${timestamp}] ${level}: ${message}`;
                    })
                ),
            }),
            new winston.transports.Console({
                level: Logger.showDebugInConsole ? "debug" : "custom",
                format: winston.format.combine(
                    winston.format.colorize({
                        all: true,
                        colors: Logger.logLevels.colors,
                    }),
                    winston.format.printf(({ message }) =>
                    {
                        return `${message}`;
                    })
                ),
            }),
        ],
    });

    static initialize()
    {
        Logger.showDebugInConsole = globalThis.G_DEBUG_CONFIGURATION;

        if (!fs.existsSync(Logger.folderPath))
        {
            fs.mkdirSync(Logger.folderPath, { recursive: true });
        }

        winston.addColors(Logger.logLevels.colors);

        process.on("uncaughtException", (error, promise) =>
        {
            Logger.error(`${error.name}: ${error.message}`);
            Logger.error(error.stack);
        });
    }

    static async writeToLogFile(data)
    {
        const command = {
            uuid: UUidGenerator.generate(),
            cmd: async () =>
                await Logger.writeFilePromisify(
                    Logger.filePath,
                    `${data}\n`,
                    true
                ),
        };
        await AsyncQueue.waitFor(command);
    }

    static async log(data, color, backgroundColor = "")
    {
        const textColor = `${color} ${backgroundColor}`.trimEnd();
        const tmpLogger = winston.createLogger({
            levels: { custom: 0 },
            level: "custom",
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize({
                            all: true,
                            colors: { custom: textColor },
                        }),
                        winston.format.printf(({ message }) => message)
                    ),
                }),
            ],
        });
        let command;
        if (typeof data === "string")
        {
            command = {
                uuid: UUidGenerator.generate(),
                cmd: async () => await tmpLogger.log("custom", data),
            };
        }
        else
        {
            command = {
                uuid: UUidGenerator.generate(),
                cmd: async () =>
                    await tmpLogger.log(
                        "custom",
                        JSON.stringify(data, null, 4)
                    ),
            };
        }
        await AsyncQueue.waitFor(command);
    }

    static async error(data)
    {
        const command = {
            uuid: UUidGenerator.generate(),
            cmd: async () => await Logger.logger.error(data),
        };
        await AsyncQueue.waitFor(command);
    }

    static async warning(data)
    {
        const command = {
            uuid: UUidGenerator.generate(),
            cmd: async () => await Logger.logger.warn(data),
        };
        await AsyncQueue.waitFor(command);
    }

    static async success(data)
    {
        const command = {
            uuid: UUidGenerator.generate(),
            cmd: async () => await Logger.logger.succ(data),
        };
        await AsyncQueue.waitFor(command);
    }

    static async info(data)
    {
        const command = {
            uuid: UUidGenerator.generate(),
            cmd: async () => await Logger.logger.info(data),
        };
        await AsyncQueue.waitFor(command);
    }

    static async logWithColor(
        data,
        textColor,
        backgroundColor = LogBackgroundColor.DEFAULT
    )
    {
        const command = {
            uuid: UUidGenerator.generate(),
            cmd: async () =>
                await Logger.log(
                    data,
                    textColor.toString(),
                    backgroundColor.toString()
                ),
        };
        await AsyncQueue.waitFor(command);
    }

    static async debug(data, isError = false, onlyShowInConsole = false)
    {
        let command;
        if (onlyShowInConsole)
        {
            command = {
                uuid: UUidGenerator.generate(),
                cmd: async () =>
                    await Logger.log(data, Logger.logLevels.colors.debug),
            };
        }
        else
        {
            command = {
                uuid: UUidGenerator.generate(),
                cmd: async () => await Logger.logger.debug(data),
            };
        }
        await AsyncQueue.waitFor(command);
    }
}

module.exports = Logger;

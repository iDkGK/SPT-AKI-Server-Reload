"use strict";

require("../Lib.js");

class WatermarkLocale
{
    static locales = {
        "en-US": {
            "description": [
                "https://discord.sp-tarkov.com",
                "",
                "This work is free of charge",
                "Commercial use is prohibited"
            ],
            "warning": [
                "",
                "NO SUPPORT FOR THIS BUILD",
                "USE AT YOUR OWN RISK"
            ]
        },
        "zh-CN": {
            "description": [
                "https://sns.oddba.cn",
                "",
                "本作品完全免费，禁止用于商业用途"
            ],
            "warning": [
                "",
                "当前版本无可用技术支持",
                "请自行承担使用风险"
            ]
        }
    };

    static getLocale()
    {
        const locale = require("os-locale").sync();
        return (!WatermarkLocale.locales[locale]) ? "en-US" : locale;
    }

    static getDescription()
    {
        const locale = WatermarkLocale.getLocale();
        return WatermarkLocale.locales[locale].description;
    }

    static getWarning()
    {
        const locale = WatermarkLocale.getLocale();
        return WatermarkLocale.locales[locale].warning;
    }
}

class Watermark
{
    static text = [];
    static versionLabel = "";

    static initialize()
    {
        const description = WatermarkLocale.getDescription();
        const warning = WatermarkLocale.getWarning();
        const versionTag = Watermark.getVersionTag();

        Watermark.versionLabel = `${AkiConfig.projectName} ${versionTag}`;

        Watermark.text = [Watermark.versionLabel];
        Watermark.text = [...Watermark.text, ...description];

        if (globalThis.G_DEBUG_CONFIGURATION)
        {
            Watermark.text = [...Watermark.text, ...warning];
        }
    }

    static getVersionTag()
    {
        let versionTag = AkiConfig.akiVersion;

        if (globalThis.G_DEBUG_CONFIGURATION)
        {
            versionTag = `${versionTag}-BLEEDINGEDGE`;
        }

        return versionTag;
    }

    /** Set window title */
    static setTitle()
    {
        process.title = Watermark.versionLabel;
    }

    /** Reset console cursor to top */
    static resetCursor()
    {
        process.stdout.write("\u001B[2J\u001B[0;0f");
    }

    /** Draw the watermark */
    static draw()
    {
        const result = [];

        // calculate size
        const longestLength = Watermark.text.reduce((a, b) =>
        {
            const a2 = String(a).replace(/[\u0391-\uFFE5]/g, "ab");
            const b2 = String(b).replace(/[\u0391-\uFFE5]/g, "ab");
            return a2.length > b2.length ? a2 : b2;
        }).length;

        // get top-bottom line
        let line = "";

        for (let i = 0; i < longestLength; ++i)
        {
            line += "─";
        }

        // get watermark to draw
        result.push(`┌─${line}─┐`);

        for (const text of Watermark.text)
        {
            const spacingSize = longestLength - Watermark.textLength(text);
            let spacingText = text;

            for (let i = 0; i < spacingSize; ++i)
            {
                spacingText += " ";
            }

            result.push(`│ ${spacingText} │`);
        }

        result.push(`└─${line}─┘`);

        // draw the watermark
        for (const text of result)
        {
            Logger.log(text, "yellow");
        }
    }

    /** Caculate text length */
    static textLength(s)
    {
        return String(s).replace(/[\u0391-\uFFE5]/g, "ab").length;
    }
}

module.exports = Watermark;

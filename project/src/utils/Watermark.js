"use strict";

require("../Lib.js");

class WatermarkLocale
{
    static get locales()
    {
        return {
            "en-US": {
                description: [
                    "https://discord.sp-tarkov.com",
                    "",
                    "This work is free of charge",
                    "Commercial use is prohibited",
                ],
                warning: [
                    "",
                    "THIS IS A TESTING BUILD",
                    "NO SUPPORT WILL BE GIVEN",
                    "",
                    "REPORT ISSUES TO:",
                    "https://dev.sp-tarkov.com/SPT-AKI/Server/issues",
                    "",
                    "USE AT YOUR OWN RISK",
                ],
                modding: [
                    "",
                    "THIS BUILD HAS SERVER MODDING DISABLED",
                    "",
                    "THIS IS NOT AN ISSUE",
                    "DO NOT REPORT IT",
                ],
            },
            "zh-CN": {
                description: [
                    "https://sns.oddba.cn",
                    "",
                    "本作品完全免费，禁止用于商业用途",
                ],
                warning: ["", "当前版本无可用技术支持", "请自行承担使用风险"],
                modding: [""],
            },
        };
    }

    static getLocale()
    {
        const locale = Intl.DateTimeFormat().resolvedOptions().locale;
        return !WatermarkLocale.locales[locale] ? "en-US" : locale;
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

    static getModding()
    {
        const locale = WatermarkLocale.getLocale();
        return WatermarkLocale.locales[locale].modding;
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
        const modding = WatermarkLocale.getModding();
        const versionTag = Watermark.getVersionTag();

        Watermark.versionLabel = `${CoreConfig.projectName} ${versionTag}`;

        Watermark.text = [Watermark.versionLabel];
        Watermark.text = [...Watermark.text, ...description];

        if (globalThis.G_DEBUG_CONFIGURATION)
        {
            Watermark.text = Watermark.text.concat([...warning]);
        }

        if (!globalThis.G_MODS_ENABLED)
        {
            Watermark.text = Watermark.text.concat([...modding]);
        }
    }

    static getVersionTag(withEftVersion = false)
    {
        const versionTag = globalThis.G_DEBUG_CONFIGURATION
            ? `${CoreConfig.akiVersion}-BLEEDINGEDGE`
            : CoreConfig.akiVersion;

        if (withEftVersion)
        {
            const tarkovVersion = CoreConfig.compatibleTarkovVersion
                .split(".")
                .pop();
            return `${versionTag} (${tarkovVersion})`;
        }

        return versionTag;
    }

    static getVersionLabel()
    {
        return Watermark.versionLabel;
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
            line += "━";
        }

        // get watermark to draw
        result.push(`┏━${line}━┓`);

        for (const text of Watermark.text)
        {
            const spacingSize = longestLength - Watermark.textLength(text);
            let spacingText = text;

            for (let i = 0; i < spacingSize; ++i)
            {
                spacingText += " ";
            }

            result.push(`┃ ${spacingText} ┃`);
        }

        result.push(`┗━${line}━┛`);

        // draw the watermark
        for (const text of result)
        {
            Logger.logWithColor(text, LogTextColor.YELLOW);
        }
    }

    /** Caculate text length */
    static textLength(s)
    {
        return String(s).replace(/[\u0391-\uFFE5]/g, "ab").length;
    }
}

module.exports = Watermark;

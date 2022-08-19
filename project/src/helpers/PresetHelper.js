"use strict";

require("../Lib.js");

class PresetHelper
{
    static lookup = {};

    static hydratePresetStore(input)
    {
        PresetHelper.lookup = input;
    }

    static isPreset(id)
    {
        return id in DatabaseServer.getTables().globals.ItemPresets;
    }

    static hasPreset(templateId)
    {
        return templateId in PresetHelper.lookup;
    }

    static getPreset(id)
    {
        return JsonUtil.clone(
            DatabaseServer.getTables().globals.ItemPresets[id]
        );
    }

    static getPresets(templateId)
    {
        if (!PresetHelper.hasPreset(templateId))
        {
            return [];
        }

        const presets = [];
        const ids = PresetHelper.lookup[templateId];

        for (const id of ids)
        {
            presets.push(PresetHelper.getPreset(id));
        }

        return presets;
    }

    static getDefaultPreset(templateId)
    {
        if (!PresetHelper.hasPreset(templateId))
        {
            return null;
        }

        const allPresets = PresetHelper.getPresets(templateId);

        for (const preset of allPresets)
        {
            if ("_encyclopedia" in preset)
            {
                return preset;
            }
        }

        return allPresets[0];
    }

    static getBaseItemTpl(presetId)
    {
        if (PresetHelper.isPreset(presetId))
        {
            const preset = PresetHelper.getPreset(presetId);

            for (const item of preset._items)
            {
                if (preset._parent === item._id)
                {
                    return item._tpl;
                }
            }
        }

        return "";
    }
}

module.exports = PresetHelper;

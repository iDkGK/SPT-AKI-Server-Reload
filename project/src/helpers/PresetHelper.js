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
        return id in DatabaseServer.tables.globals.ItemPresets;
    }

    static hasPreset(templateId)
    {
        return templateId in PresetHelper.lookup;
    }

    static getPreset(id)
    {
        return DatabaseServer.tables.globals.ItemPresets[id];
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
            presets.push(DatabaseServer.tables.globals.ItemPresets[id]);
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
            const preset = DatabaseServer.tables.globals.ItemPresets[presetId];
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

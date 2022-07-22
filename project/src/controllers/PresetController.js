"use strict";

require("../Lib.js");

class PresetController
{
    static lookup = {};

    static initialize()
    {
        const presets = Object.values(DatabaseServer.tables.globals.ItemPresets);
        const reverse = {};

        for (const p of presets)
        {
            const tpl = p._items[0]._tpl;

            if (!(tpl in reverse))
            {
                reverse[tpl] = [];
            }

            reverse[tpl].push(p._id);
        }

        PresetController.lookup = reverse;
    }

    static isPreset(id)
    {
        return id in DatabaseServer.tables.globals.ItemPresets;
    }

    static hasPreset(templateId)
    {
        return templateId in PresetController.lookup;
    }

    static getPreset(id)
    {
        return DatabaseServer.tables.globals.ItemPresets[id];
    }

    static getPresets(templateId)
    {
        if (!PresetController.hasPreset(templateId))
        {
            return [];
        }

        const presets = [];
        const ids = PresetController.lookup[templateId];

        for (const id of ids)
        {
            presets.push(DatabaseServer.tables.globals.ItemPresets[id]);
        }

        return presets;
    }

    static getStandardPreset(templateId)
    {
        if (!PresetController.hasPreset(templateId))
        {
            return false;
        }

        const allPresets = PresetController.getPresets(templateId);

        for (const p of allPresets)
        {
            if ("_encyclopedia" in p)
            {
                return p;
            }
        }

        return allPresets[0];
    }

    static getBaseItemTpl(presetId)
    {
        if (PresetController.isPreset(presetId))
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

module.exports = PresetController;

"use strict";

require("../Lib.js");

class PresetController
{
    static initialize()
    {
        const presets = Object.values(
            DatabaseServer.tables.globals.ItemPresets
        );
        const reverse = {};

        for (const preset of presets)
        {
            const tpl = preset._items[0]._tpl;

            if (!(tpl in reverse))
            {
                reverse[tpl] = [];
            }

            reverse[tpl].push(preset._id);
        }

        PresetHelper.hydratePresetStore(reverse);
    }
}

module.exports = PresetController;

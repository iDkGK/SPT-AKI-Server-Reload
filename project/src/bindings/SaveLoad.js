"use strict";

require("../Lib.js");

module.exports = {
    "aki-health": HealthCallbacks.onSaveLoad,
    "aki-inraid": InraidCallbacks.onSaveLoad,
    "aki-insurance": InsuranceCallbacks.onSaveLoad,
    "aki-profile": ProfileCallbacks.onSaveLoad,
};

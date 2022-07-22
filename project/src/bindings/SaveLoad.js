"use strict";

require("../Lib.js");

module.exports = {
    "aki-health": HealthCallbacks.onLoad,
    "aki-inraid": InraidCallbacks.onLoad,
    "aki-insurance": InsuranceCallbacks.onLoad,
    "aki-profile": ProfileCallbacks.onLoad
};

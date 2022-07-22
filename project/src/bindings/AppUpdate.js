"use strict";

require("../Lib.js");

module.exports = {
    "aki-dialogue": DialogueCallbacks.update,
    "aki-hideout": HideoutCallbacks.update,
    "aki-insurance": InsuranceCallbacks.update,
    "aki-ragfair-offers": RagfairCallbacks.update,
    "aki-ragfair-player": RagfairCallbacks.updatePlayer,
    "aki-traders": TraderCallbacks.update,
    "aki-save": SaveCallbacks.update
};

"use strict";

require("../Lib.js");

module.exports = {
    "IMAGE": HttpCallbacks.sendImage,
    "BUNDLE": BundleCallbacks.sendBundle,
    "NOTIFY": NotifierCallbacks.sendNotification
};

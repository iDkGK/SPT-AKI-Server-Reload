"use strict";

require("../Lib.js");

module.exports = {
    "/singleplayer/settings/bot/limit/": {
        aki: BotCallbacks.getBotLimit,
    },
    "/singleplayer/settings/bot/difficulty/": {
        aki: BotCallbacks.getBotDifficulty,
    },
    "/singleplayer/settings/bot/maxCap": {
        aki: BotCallbacks.getBotCap,
    },
    ".bundle": {
        aki: BundleCallbacks.getBundle,
    },
    "/client/trading/customization/": {
        aki: CustomizationCallbacks.getTraderSuits,
    },
    "/client/menu/locale/": {
        aki: DataCallbacks.getLocalesMenu,
    },
    "/client/locale/": {
        aki: DataCallbacks.getLocalesGlobal,
    },
    ".jpg": {
        aki: HttpCallbacks.getImage,
    },
    ".png": {
        aki: HttpCallbacks.getImage,
    },
    ".ico": {
        aki: HttpCallbacks.getImage,
    },
    "/client/location/getLocalloot": {
        "aki-name": InraidCallbacks.registerPlayer,
        "aki-loot": LocationCallbacks.getLocation,
    },
    "/?last_id": {
        aki: NotifierCallbacks.notify,
    },
    "/notifierServer": {
        aki: NotifierCallbacks.notify,
    },
    "/push/notifier/get/": {
        aki: NotifierCallbacks.getNotifier,
    },
    "/push/notifier/getwebsocket/": {
        aki: NotifierCallbacks.getNotifier,
    },
    "/client/trading/api/getUserAssortPrice/trader/": {
        aki: TraderCallbacks.getProfilePurchases,
    },
    "/client/trading/api/getTrader/": {
        aki: TraderCallbacks.getTrader,
    },
    "/client/trading/api/getTraderAssort/": {
        aki: TraderCallbacks.getAssort,
    },
};

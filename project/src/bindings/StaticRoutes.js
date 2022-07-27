"use strict";

require("../Lib.js");

module.exports = {
    "/client/game/bot/generate": {
        aki: BotCallbacks.generateBots,
    },
    "/client/trading/customization/storage": {
        aki: CustomizationCallbacks.getSuits,
    },
    "/client/settings": {
        aki: DataCallbacks.getSettings,
    },
    "/client/globals": {
        aki: DataCallbacks.getGlobals,
    },
    "/client/items": {
        aki: DataCallbacks.getTemplateItems,
    },
    "/client/handbook/templates": {
        aki: DataCallbacks.getTemplateHandbook,
    },
    "/client/customization": {
        aki: DataCallbacks.getTemplateSuits,
    },
    "/client/account/customization": {
        aki: DataCallbacks.getTemplateCharacter,
    },
    "/client/hideout/production/recipes": {
        aki: DataCallbacks.gethideoutProduction,
    },
    "/client/hideout/settings": {
        aki: DataCallbacks.getHideoutSettings,
    },
    "/client/hideout/areas": {
        aki: DataCallbacks.getHideoutAreas,
    },
    "/client/hideout/production/scavcase/recipes": {
        aki: DataCallbacks.getHideoutScavcase,
    },
    "/client/languages": {
        aki: DataCallbacks.getLocalesLanguages,
    },
    "/client/chatServer/list": {
        aki: DialogueCallbacks.getChatServerList,
    },
    "/client/mail/dialog/list": {
        aki: DialogueCallbacks.getMailDialogList,
    },
    "/client/mail/dialog/view": {
        aki: DialogueCallbacks.getMailDialogView,
    },
    "/client/mail/dialog/info": {
        aki: DialogueCallbacks.getMailDialogInfo,
    },
    "/client/mail/dialog/remove": {
        aki: DialogueCallbacks.removeDialog,
    },
    "/client/mail/dialog/pin": {
        aki: DialogueCallbacks.pinDialog,
    },
    "/client/mail/dialog/unpin": {
        aki: DialogueCallbacks.unpinDialog,
    },
    "/client/mail/dialog/read": {
        aki: DialogueCallbacks.setRead,
    },
    "/client/mail/dialog/getAllAttachments": {
        aki: DialogueCallbacks.getAllAttachments,
    },
    "/client/mail/msg/send": {
        aki: DialogueCallbacks.sendMessage,
    },
    "/client/friend/list": {
        aki: DialogueCallbacks.getFriendList,
    },
    "/client/friend/request/list/outbox": {
        aki: DialogueCallbacks.listOutbox,
    },
    "/client/friend/request/list/inbox": {
        aki: DialogueCallbacks.listInbox,
    },
    "/client/friend/request/send": {
        aki: DialogueCallbacks.friendRequest,
    },
    "/client/game/config": {
        aki: GameCallbacks.getGameConfig,
    },
    "/client/server/list": {
        aki: GameCallbacks.getServer,
    },
    "/client/game/version/validate": {
        aki: GameCallbacks.versionValidate,
    },
    "/client/game/start": {
        aki: GameCallbacks.gameStart,
    },
    "/client/game/logout": {
        aki: GameCallbacks.gameLogout,
    },
    "/client/checkVersion": {
        aki: GameCallbacks.validateGameVersion,
    },
    "/client/game/keepalive": {
        aki: GameCallbacks.gameKeepalive,
    },
    "/player/health/sync": {
        aki: HealthCallbacks.syncHealth,
    },
    "/raid/profile/save": {
        aki: InraidCallbacks.saveProgress,
    },
    "/singleplayer/settings/raid/endstate": {
        aki: InraidCallbacks.getRaidEndState,
    },
    "/singleplayer/settings/weapon/durability": {
        aki: InraidCallbacks.getWeaponDurability,
    },
    "/singleplayer/settings/raid/menu": {
        aki: InraidCallbacks.getRaidMenuSettings,
    },
    "/singleplayer/airdrop/config": {
        aki: InraidCallbacks.getAirdropConfig,
    },
    "/singleplayer/settings/version": {
        aki: GameCallbacks.getVersion,
    },
    "/client/insurance/items/list/cost": {
        aki: InsuranceCallbacks.getInsuranceCost,
    },
    "/client/game/profile/items/moving": {
        aki: ItemEventCallbacks.handleEvents,
    },
    "/launcher/server/connect": {
        aki: LauncherCallbacks.connect,
    },
    "/launcher/profile/login": {
        aki: LauncherCallbacks.login,
    },
    "/launcher/profile/register": {
        aki: LauncherCallbacks.register,
    },
    "/launcher/profile/get": {
        aki: LauncherCallbacks.get,
    },
    "/launcher/profile/change/username": {
        aki: LauncherCallbacks.changeUsername,
    },
    "/launcher/profile/change/password": {
        aki: LauncherCallbacks.changePassword,
    },
    "/launcher/profile/change/wipe": {
        aki: LauncherCallbacks.wipe,
    },
    "/launcher/profile/info": {
        aki: LauncherCallbacks.getMiniProfile,
    },
    "/launcher/profile/remove": {
        aki: LauncherCallbacks.removeProfile,
    },
    "/launcher/profile/compatibleTarkovVersion": {
        aki: LauncherCallbacks.getCompatibleTarkovVersion,
    },
    "/launcher/profiles": {
        aki: LauncherCallbacks.getAllMiniProfiles,
    },
    "/launcher/server/version": {
        aki: LauncherCallbacks.getServerVersion,
    },
    "/launcher/ping": {
        aki: LauncherCallbacks.ping,
    },
    "/client/locations": {
        aki: LocationCallbacks.getLocationData,
    },
    "/raid/profile/list": {
        aki: MatchCallbacks.getProfile,
    },
    "/client/match/available": {
        aki: MatchCallbacks.serverAvailable,
    },
    "/client/match/updatePing": {
        aki: MatchCallbacks.updatePing,
    },
    "/client/match/join": {
        aki: MatchCallbacks.joinMatch,
    },
    "/client/match/exit": {
        aki: MatchCallbacks.exitMatch,
    },
    "/client/match/group/create": {
        aki: MatchCallbacks.createGroup,
    },
    "/client/match/group/delete": {
        aki: MatchCallbacks.deleteGroup,
    },
    "/client/match/group/status": {
        aki: MatchCallbacks.getGroupStatus,
    },
    "/client/match/group/start_game": {
        aki: MatchCallbacks.joinMatch,
    },
    "/client/match/group/exit_from_menu": {
        aki: MatchCallbacks.exitToMenu,
    },
    "/client/match/group/looking/start": {
        aki: MatchCallbacks.startGroupSearch,
    },
    "/client/match/group/looking/stop": {
        aki: MatchCallbacks.stopGroupSearch,
    },
    "/client/match/group/invite/send": {
        aki: MatchCallbacks.sendGroupInvite,
    },
    "/client/match/group/invite/accept": {
        aki: MatchCallbacks.acceptGroupInvite,
    },
    "/client/match/group/invite/cancel": {
        aki: MatchCallbacks.cancelGroupInvite,
    },
    "/client/match/offline/start": {
        aki: MatchCallbacks.startOfflineRaid,
    },
    "/client/match/offline/end": {
        aki: MatchCallbacks.endOfflineRaid,
    },
    "/client/putMetrics": {
        aki: MatchCallbacks.putMetrics,
    },
    "/client/getMetricsConfig": {
        aki: MatchCallbacks.getMetrics,
    },
    "/singleplayer/bundles": {
        aki: BundleCallbacks.getBundles,
    },
    "/client/notifier/channel/create": {
        aki: NotifierCallbacks.createNotifierChannel,
    },
    "/client/game/profile/select": {
        aki: NotifierCallbacks.selectProfile,
    },
    "/client/handbook/builds/my/list": {
        aki: PresetBuildCallbacks.getHandbookUserlist,
    },
    "/client/game/profile/create": {
        aki: ProfileCallbacks.createProfile,
    },
    "/client/game/profile/list": {
        aki: ProfileCallbacks.getProfileData,
    },
    "/client/game/profile/savage/regenerate": {
        aki: ProfileCallbacks.regenerateScav,
    },
    "/client/game/profile/voice/change": {
        aki: ProfileCallbacks.changeVoice,
    },
    "/client/game/profile/nickname/change": {
        aki: ProfileCallbacks.changeNickname,
    },
    "/client/game/profile/nickname/validate": {
        aki: ProfileCallbacks.validateNickname,
    },
    "/client/game/profile/nickname/reserved": {
        aki: ProfileCallbacks.getReservedNickname,
    },
    "/client/profile/status": {
        aki: ProfileCallbacks.getProfileStatus,
    },
    "/client/game/profile/search": {
        aki: ProfileCallbacks.searchFriend,
    },
    "/client/quest/list": {
        aki: QuestCallbacks.listQuests,
    },
    "/client/repeatalbeQuests/activityPeriods": {
        aki: QuestCallbacks.activityPeriods,
    },
    "/client/ragfair/search": {
        aki: RagfairCallbacks.search,
    },
    "/client/ragfair/find": {
        aki: RagfairCallbacks.search,
    },
    "/client/ragfair/itemMarketPrice": {
        aki: RagfairCallbacks.getMarketPrice,
    },
    "/client/items/prices": {
        aki: RagfairCallbacks.getItemPrices,
    },
    "/client/trading/api/traderSettings": {
        aki: TraderCallbacks.getTraderSettings,
    },
    "/client/weather": {
        aki: WeatherCallbacks.getWeather,
    },
};

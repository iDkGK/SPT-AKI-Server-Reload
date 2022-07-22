"use strict";

require("../Lib.js");

module.exports = {
    "CustomizationWear": {
        "aki": CustomizationCallbacks.wearClothing
    },
    "CustomizationBuy": {
        "aki": CustomizationCallbacks.buyClothing
    },
    "Eat": {
        "aki": HealthCallbacks.offraidEat
    },
    "Heal": {
        "aki": HealthCallbacks.offraidHeal
    },
    "RestoreHealth": {
        "aki": HealthCallbacks.healthTreatment
    },
    "HideoutUpgrade": {
        "aki": HideoutCallbacks.upgrade
    },
    "HideoutUpgradeComplete": {
        "aki": HideoutCallbacks.upgradeComplete
    },
    "HideoutPutItemsInAreaSlots": {
        "aki": HideoutCallbacks.putItemsInAreaSlots
    },
    "HideoutTakeItemsFromAreaSlots": {
        "aki": HideoutCallbacks.takeItemsFromAreaSlots
    },
    "HideoutToggleArea": {
        "aki": HideoutCallbacks.toggleArea
    },
    "HideoutSingleProductionStart": {
        "aki": HideoutCallbacks.singleProductionStart
    },
    "HideoutScavCaseProductionStart": {
        "aki": HideoutCallbacks.scavCaseProductionStart
    },
    "HideoutContinuousProductionStart": {
        "aki": HideoutCallbacks.continuousProductionStart
    },
    "HideoutTakeProduction": {
        "aki": HideoutCallbacks.takeProduction
    },
    "Insure": {
        "aki": InsuranceCallbacks.insure
    },
    "Move": {
        "aki": InventoryCallbacks.moveItem
    },
    "Remove": {
        "aki": InventoryCallbacks.removeItem
    },
    "Split": {
        "aki": InventoryCallbacks.splitItem
    },
    "Merge": {
        "aki": InventoryCallbacks.mergeItem
    },
    "Transfer": {
        "aki": InventoryCallbacks.transferItem
    },
    "Swap": {
        "aki": InventoryCallbacks.swapItem
    },
    "Fold": {
        "aki": InventoryCallbacks.foldItem
    },
    "Toggle": {
        "aki": InventoryCallbacks.toggleItem
    },
    "Tag": {
        "aki": InventoryCallbacks.tagItem
    },
    "Bind": {
        "aki": InventoryCallbacks.bindItem
    },
    "Examine": {
        "aki": InventoryCallbacks.examineItem
    },
    "ReadEncyclopedia": {
        "aki": InventoryCallbacks.readEncyclopedia
    },
    "ApplyInventoryChanges": {
        "aki": InventoryCallbacks.sortInventory
    },
    "AddNote": {
        "aki": NoteCallbacks.addNote
    },
    "EditNote": {
        "aki": NoteCallbacks.editNote
    },
    "DeleteNote": {
        "aki": NoteCallbacks.deleteNote
    },
    "SaveBuild": {
        "aki": PresetBuildCallbacks.saveBuild
    },
    "RemoveBuild": {
        "aki": PresetBuildCallbacks.removeBuild
    },
    "QuestAccept": {
        "aki": QuestCallbacks.acceptQuest
    },
    "QuestComplete": {
        "aki": QuestCallbacks.completeQuest
    },
    "QuestHandover": {
        "aki": QuestCallbacks.handoverQuest
    },
    "RagFairAddOffer": {
        "aki": RagfairCallbacks.addOffer
    },
    "RagFairRemoveOffer": {
        "aki": RagfairCallbacks.removeOffer
    },
    "RagFairRenewOffer": {
        "aki": RagfairCallbacks.extendOffer
    },
    "Repair": {
        "aki": RepairCallbacks.repair
    },
    "TradingConfirm": {
        "aki": TradeCallbacks.processTrade
    },
    "RagFairBuyOffer": {
        "aki": TradeCallbacks.processRagfairTrade
    },
    "AddToWishList": {
        "aki": WishlistCallbacks.addToWishlist
    },
    "RemoveFromWishList": {
        "aki": WishlistCallbacks.removeFromWishlist
    },
    "CreateMapMarker": {
        "aki": InventoryCallbacks.createMapMarker
    },
    "DeleteMapMarker": {
        "aki": InventoryCallbacks.deleteMapMarker
    },
    "EditMapMarker": {
        "aki": InventoryCallbacks.editMapMarker
    }
};

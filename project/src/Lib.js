// callbacks
globalThis.BotCallbacks = require("./callbacks/BotCallbacks.js");
globalThis.BundleCallbacks = require("./callbacks/BundleCallbacks.js");
globalThis.CustomizationCallbacks = require("./callbacks/CustomizationCallbacks.js");
globalThis.DataCallbacks = require("./callbacks/DataCallbacks.js");
globalThis.DialogueCallbacks = require("./callbacks/DialogueCallbacks.js");
globalThis.GameCallbacks = require("./callbacks/GameCallbacks.js");
globalThis.HandbookCallbacks = require("./callbacks/HandbookCallbacks.js");
globalThis.HealthCallbacks = require("./callbacks/HealthCallbacks.js");
globalThis.HideoutCallbacks = require("./callbacks/HideoutCallbacks.js");
globalThis.HttpCallbacks = require("./callbacks/HttpCallbacks.js");
globalThis.InraidCallbacks = require("./callbacks/InraidCallbacks.js");
globalThis.InsuranceCallbacks = require("./callbacks/InsuranceCallbacks.js");
globalThis.InventoryCallbacks = require("./callbacks/InventoryCallbacks.js");
globalThis.ItemEventCallbacks = require("./callbacks/ItemEventCallbacks.js");
globalThis.LauncherCallbacks = require("./callbacks/LauncherCallbacks.js");
globalThis.LocationCallbacks = require("./callbacks/LocationCallbacks.js");
globalThis.MatchCallbacks = require("./callbacks/MatchCallbacks.js");
globalThis.ModCallbacks = require("./callbacks/ModCallbacks.js");
globalThis.NoteCallbacks = require("./callbacks/NoteCallbacks.js");
globalThis.NotifierCallbacks = require("./callbacks/NotifierCallbacks.js");
globalThis.PresetBuildCallbacks = require("./callbacks/PresetBuildCallbacks.js");
globalThis.PresetCallbacks = require("./callbacks/PresetCallbacks.js");
globalThis.ProfileCallbacks = require("./callbacks/ProfileCallbacks.js");
globalThis.QuestCallbacks = require("./callbacks/QuestCallbacks.js");
globalThis.RagfairCallbacks = require("./callbacks/RagfairCallbacks.js");
globalThis.RepairCallbacks = require("./callbacks/RepairCallbacks.js");
globalThis.SaveCallbacks = require("./callbacks/SaveCallbacks.js");
globalThis.TradeCallbacks = require("./callbacks/TradeCallbacks.js");
globalThis.TraderCallbacks = require("./callbacks/TraderCallbacks.js");
globalThis.WeatherCallbacks = require("./callbacks/WeatherCallbacks.js");
globalThis.WishlistCallbacks = require("./callbacks/WishlistCallbacks.js");

// controllers
globalThis.BotController = require("./controllers/BotController.js");
globalThis.CustomizationController = require("./controllers/CustomizationController.js");
globalThis.DialogueController = require("./controllers/DialogueController.js");
globalThis.GameController = require("./controllers/GameController.js");
globalThis.HandbookController = require("./controllers/HandbookController.js");
globalThis.HealthController = require("./controllers/HealthController.js");
globalThis.HideoutController = require("./controllers/HideoutController.js");
globalThis.InraidController = require("./controllers/InraidController.js");
globalThis.InsuranceController = require("./controllers/InsuranceController.js");
globalThis.InventoryController = require("./controllers/InventoryController.js");
globalThis.LauncherController = require("./controllers/LauncherController.js");
globalThis.LocationController = require("./controllers/LocationController.js");
globalThis.MatchController = require("./controllers/MatchController.js");
globalThis.NoteController = require("./controllers/NoteController.js");
globalThis.NotifierController = require("./controllers/NotifierController.js");
globalThis.PresetBuildController = require("./controllers/PresetBuildController.js");
globalThis.PresetController = require("./controllers/PresetController.js");
globalThis.ProfileController = require("./controllers/ProfileController.js");
globalThis.QuestController = require("./controllers/QuestController.js");
globalThis.RagfairController = require("./controllers/RagfairController.js");
globalThis.RepairController = require("./controllers/RepairController.js");
globalThis.RepeatableQuestController = require("./controllers/RepeatableQuestController.js");
globalThis.TradeController = require("./controllers/TradeController.js");
globalThis.TraderController = require("./controllers/TraderController.js");
globalThis.WeatherController = require("./controllers/WeatherController.js");
globalThis.WishlistController = require("./controllers/WishlistController.js");

// generators
globalThis.BotGenerator = require("./generators/BotGenerator.js");
globalThis.BotInventoryGenerator = require("./generators/BotInventoryGenerator.js");
globalThis.BotLootGenerator = require("./generators/BotLootGenerator.js");
globalThis.BotWeaponGenerator = require("./generators/BotWeaponGenerator.js");
globalThis.LocationGenerator = require("./generators/LocationGenerator.js");
globalThis.PlayerScavGenerator = require("./generators/PlayerScavGenerator.js");
globalThis.PMCLootGenerator = require("./generators/PMCLootGenerator.js");
globalThis.RagfairAssortGenerator = require("./generators/RagfairAssortGenerator.js");
globalThis.RagfairOfferGenerator = require("./generators/RagfairOfferGenerator.js");
globalThis.ScavCaseRewardGenerator = require("./generators/ScavCaseRewardGenerator.js");
globalThis.WeatherGenerator = require("./generators/WeatherGenerator.js");

// helpers
globalThis.AssortHelper = require("./helpers/AssortHelper.js");
globalThis.BotGeneratorHelper = require("./helpers/BotGeneratorHelper.js");
globalThis.BotHelper = require("./helpers/BotHelper.js");
globalThis.ContainerHelper = require("./helpers/ContainerHelper.js");
globalThis.DialogueHelper = require("./helpers/DialogueHelper.js");
globalThis.DurabilityLimitsHelper = require("./helpers/DurabilityLimitsHelper.js");
globalThis.GameEventHelper = require("./helpers/GameEventHelper.js");
globalThis.HandbookHelper = require("./helpers/HandbookHelper.js");
globalThis.HealthHelper = require("./helpers/HealthHelper.js");
globalThis.HideoutHelper = require("./helpers/HideoutHelper.js");
globalThis.HttpServerHelper = require("./helpers/HttpServerHelper.js");
globalThis.InRaidHelper = require("./helpers/InRaidHelper.js");
globalThis.InventoryHelper = require("./helpers/InventoryHelper.js");
globalThis.ItemHelper = require("./helpers/ItemHelper.js");
globalThis.NotificationSendHelper = require("./helpers/NotificationSendHelper.js");
globalThis.NotifierHelper = require("./helpers/NotifierHelper.js");
globalThis.PaymentHelper = require("./helpers/PaymentHelper.js");
globalThis.PresetHelper = require("./helpers/PresetHelper.js");
globalThis.ProbabilityHelper = require("./helpers/ProbabilityHelper.js");
globalThis.ProfileHelper = require("./helpers/ProfileHelper.js");
globalThis.QuestConditionHelper = require("./helpers/QuestConditionHelper.js");
globalThis.QuestHelper = require("./helpers/QuestHelper.js");
globalThis.RagfairHelper = require("./helpers/RagfairHelper.js");
globalThis.RagfairOfferHelper = require("./helpers/RagfairOfferHelper.js");
globalThis.RagfairSellHelper = require("./helpers/RagfairSellHelper.js");
globalThis.RagfairServerHelper = require("./helpers/RagfairServerHelper.js");
globalThis.RagfairSortHelper = require("./helpers/RagfairSortHelper.js");
globalThis.RagfairTaxHelper = require("./helpers/RagfairTaxHelper.js");
globalThis.RepairHelper = require("./helpers/RepairHelper.js");
globalThis.SecureContainerHelper = require("./helpers/SecureContainerHelper.js");
globalThis.TradeHelper = require("./helpers/TradeHelper.js");
globalThis.TraderAssortHelper = require("./helpers/TraderAssortHelper.js");
globalThis.TraderHelper = require("./helpers/TraderHelper.js");
globalThis.UtilityHelper = require("./helpers/UtilityHelper.js");
globalThis.WeightedRandomHelper = require("./helpers/WeightedRandomHelper.js");

// loaders
globalThis.BundleLoader = require("./loaders/BundleLoader.js");
globalThis.ModLoader = require("./loaders/ModLoader.js");

// models
// eft
globalThis.BanType = require("./models/eft/common/tables/BanType.js");
globalThis.SurvivorClass = require("./models/eft/common/tables/SurvivorClass.js");
globalThis.WildSpawnType = require("./models/eft/common/WildSpawnType.js");
globalThis.BodyPart = require("./models/eft/health/BodyPart.js");
globalThis.Effect = require("./models/eft/health/Effect.js");
globalThis.OfferOwnerType = require("./models/eft/ragfair/OfferOwnerType.js");
// enums
globalThis.AmmoTypes = require("./models/enums/AmmoTypes.js");
globalThis.BaseClasses = require("./models/enums/BaseClasses.js");
globalThis.BotAmount = require("./models/enums/BotAmount.js");
globalThis.BotDifficulty = require("./models/enums/BotDifficulty.js");
globalThis.ConfigTypes = require("./models/enums/ConfigTypes.js");
globalThis.ContainerTypes = require("./models/enums/ContainerTypes.js");
globalThis.ELocationName = require("./models/enums/ELocationName.js");
globalThis.EquipmentSlots = require("./models/enums/EquipmentSlots.js");
globalThis.HideoutAreas = require("./models/enums/HideoutAreas.js");
globalThis.MemberCategory = require("./models/enums/MemberCategory.js");
globalThis.MessageType = require("./models/enums/MessageType.js");
globalThis.Money = require("./models/enums/Money.js");
globalThis.QuestRewardType = require("./models/enums/QuestRewardType.js");
globalThis.QuestStatus = require("./models/enums/QuestStatus.js");
globalThis.RaidMode = require("./models/enums/RaidMode.js");
globalThis.SkillTypes = require("./models/enums/SkillTypes.js");
globalThis.Traders = require("./models/enums/Traders.js");
globalThis.WeaponSkillTypes = require("./models/enums/WeaponSkillTypes.js");
// spt
globalThis.LootCacheType = require("./models/spt/bots/LootCacheType.js");
globalThis.LogBackgroundColor = require("./models/spt/logging/LogBackgroundColor.js");
globalThis.LogTextColor = require("./models/spt/logging/LogTextColor.js");

// routers
globalThis.HttpRouter = require("./routers/HttpRouter.js");
globalThis.ImageRouter = require("./routers/ImageRouter.js");
globalThis.ItemEventRouter = require("./routers/ItemEventRouter.js");

// servers
globalThis.ConfigServer = require("./servers/ConfigServer.js");
globalThis.DatabaseServer = require("./servers/DatabaseServer.js");
globalThis.HttpServer = require("./servers/HttpServer.js");
globalThis.RagfairServer = require("./servers/RagfairServer.js");
globalThis.SaveServer = require("./servers/SaveServer.js");

// services
globalThis.BotEquipmentFilterService = require("./services/BotEquipmentFilterService.js");
globalThis.BotLootCacheService = require("./services/BotLootCacheService.js");
globalThis.FenceService = require("./services/FenceService.js");
globalThis.InsuranceService = require("./services/InsuranceService.js");
globalThis.ImageRouteService = require("./services/ImageRouteService.js");
globalThis.LocaleService = require("./services/LocaleService.js");
globalThis.MatchLocationService = require("./services/MatchLocationService.js");
globalThis.NotificationService = require("./services/NotificationService.js");
globalThis.PaymentService = require("./services/PaymentService.js");
globalThis.PlayerService = require("./services/PlayerService.js");
globalThis.ProfileFixerService = require("./services/ProfileFixerService.js");
globalThis.ProfileSnapshotService = require("./services/ProfileSnapshotService.js");
globalThis.PlayerService = require("./services/PlayerService.js");
globalThis.RagfairCategoriesService = require("./services/RagfairCategoriesService.js");
globalThis.RagfairLinkedItemService = require("./services/RagfairLinkedItemService.js");
globalThis.RagfairOfferService = require("./services/RagfairOfferService.js");
globalThis.RagfairPriceService = require("./services/RagfairPriceService.js");
globalThis.RagfairRequiredItemsService = require("./services/RagfairRequiredItemsService.js");
globalThis.TraderAssortService = require("./services/TraderAssortService.js");

// utils
globalThis.AsyncQueue = require("./utils/AsyncQueue.js");
globalThis.DatabaseImporter = require("./utils/DatabaseImporter.js");
globalThis.HashUtil = require("./utils/HashUtil.js");
globalThis.HttpResponseUtil = require("./utils/HttpResponseUtil.js");
globalThis.JsonUtil = require("./utils/JsonUtil.js");
globalThis.Logger = require("./utils/Logger.js");
globalThis.MathUtil = require("./utils/MathUtil.js");
globalThis.ObjectId = require("./utils/ObjectId.js");
globalThis.RandomUtil = require("./utils/RandomUtil.js");
globalThis.TimeUtil = require("./utils/TimeUtil.js");
globalThis.UUidGenerator = require("./utils/UUidGenerator.js");
globalThis.VFS = require("./utils/VFS.js");
globalThis.Watermark = require("./utils/Watermark.js");

// utils
globalThis.DatabaseImporter = require("./utils/DatabaseImporter.js");
globalThis.HashUtil = require("./utils/HashUtil.js");
globalThis.HttpResponse = require("./utils/HttpResponse.js");
globalThis.JsonUtil = require("./utils/JsonUtil.js");
globalThis.Logger = require("./utils/Logger.js");
globalThis.MathUtil = require("./utils/MathUtil.js");
globalThis.ObjectId = require("./utils/ObjectId.js");
globalThis.RandomUtil = require("./utils/RandomUtil.js");
globalThis.VFS = require("./utils/VFS.js");
globalThis.TimeUtil = require("./utils/TimeUtil.js");

// loaders
globalThis.BundleLoader = require("./loaders/BundleLoader.js");
globalThis.ModLoader = require("./loaders/ModLoader.js");

// helpers
globalThis.ContainerHelper = require("./helpers/ContainerHelper.js");
globalThis.InventoryHelper = require("./helpers/InventoryHelper.js");
globalThis.ItemHelper = require("./helpers/ItemHelper.js");
globalThis.GameEventHelper = require("./helpers/GameEventHelper.js");
globalThis.QuestHelper = require("./helpers/QuestHelper.js");
globalThis.UtilityHelper = require("./helpers/UtilityHelper.js");
globalThis.TraderHelper = require("./helpers/TraderHelper.js");
globalThis.RagfairServerHelper = require("./helpers/RagfairServerHelper.js");
globalThis.DurabilityLimitsHelper = require("./helpers/DurabilityLimitsHelper.js");
globalThis.WeightedRandomHelper = require("./helpers/WeightedRandomHelper.js");

// generators
globalThis.BotGenerator = require("./generators/BotGenerator.js");
globalThis.PMCLootGenerator = require("./generators/PMCLootGenerator.js");
globalThis.LocationGenerator = require("./generators/LocationGenerator.js");
globalThis.RagfairOfferGenerator = require("./generators/RagfairOfferGenerator.js");
globalThis.RagfairAssortGenerator = require("./generators/RagfairAssortGenerator.js");

// configs
globalThis.AkiConfig = require("./configs/AkiConfig.js");
globalThis.BotConfig = require("./configs/BotConfig.js");
globalThis.HealthConfig = require("./configs/HealthConfig.js");
globalThis.HideoutConfig = require("./configs/HideoutConfig.js");
globalThis.HttpConfig = require("./configs/HttpConfig.js");
globalThis.InraidConfig = require("./configs/InraidConfig.js");
globalThis.InsuranceConfig = require("./configs/InsuranceConfig.js");
globalThis.InventoryConfig = require("./configs/InventoryConfig.js");
globalThis.LocationConfig = require("./configs/LocationConfig.js");
globalThis.MatchConfig = require("./configs/MatchConfig.js");
globalThis.QuestConfig = require("./configs/QuestConfig.js");
globalThis.RagfairConfig = require("./configs/RagfairConfig.js");
globalThis.RepairConfig = require("./configs/RepairConfig.js");
globalThis.TraderConfig = require("./configs/TraderConfig.js");
globalThis.WeatherConfig = require("./configs/WeatherConfig.js");

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
globalThis.RepeatableQuestController = require("./controllers/RepeatableQuestController.js");
globalThis.RagfairController = require("./controllers/RagfairController.js");
globalThis.RepairController = require("./controllers/RepairController.js");
globalThis.TradeController = require("./controllers/TradeController.js");
globalThis.TraderController = require("./controllers/TraderController.js");
globalThis.WeatherController = require("./controllers/WeatherController.js");
globalThis.WishlistController = require("./controllers/WishlistController.js");
globalThis.PaymentController = require("./controllers/PaymentController");
globalThis.PlayerController = require("./controllers/PlayerController.js");

// servers
globalThis.DatabaseServer = require("./servers/DatabaseServer.js");
globalThis.HttpServer = require("./servers/HttpServer.js");
globalThis.RagfairServer = require("./servers/RagfairServer.js");
globalThis.SaveServer = require("./servers/SaveServer.js");

// routers
globalThis.HttpRouter = require("./routers/HttpRouter.js");
globalThis.ImageRouter = require("./routers/ImageRouter.js");
globalThis.ItemEventRouter = require("./routers/ItemEventRouter.js");
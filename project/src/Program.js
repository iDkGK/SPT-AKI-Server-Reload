"use strict";

require("./Lib.js");

const App = require("./utils/App");

class Program
{
    static main()
    {
        // set window properties
        process.stdout.setEncoding("utf8");
        process.title = "SPT-AKI Server";

        // enable exception logging
        Logger.initialize();

        // load all configs
        ConfigServer.initialize();

        // show watermark
        Watermark.initialize();
        Watermark.setTitle();
        Watermark.resetCursor();
        // Watermark.draw();

        // load and execute all packages
        App.load();
    }
}

Program.main();

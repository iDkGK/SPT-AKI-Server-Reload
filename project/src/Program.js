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

        // importing configs
        ConfigServer.initialize();

        // enable exception logging
        Logger.initialize();

        // show watermark
        Watermark.initialize();
        Watermark.setTitle();
        Watermark.resetCursor();
        Watermark.draw();

        // load and execute all packages
        App.load();
    }
}

Program.main();

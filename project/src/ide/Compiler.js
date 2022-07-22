const nexe = require("nexe");
const path = require("path");
const process = require("child_process");
const VFS = require("../utils/VFS.js");

require("./CheckVersion.js");

class Compiler
{
    static pkgjson = JsonUtil.deserialize(VFS.readFile("package.json"));
    static buildOptions = {
        "tmp": {
            "dir": "obj/",
            "exe": "Server-Tmp.exe"
        },
        "build": {
            "dir": "build/",
            "exe": "Server.exe"
        },
        "icon": "assets/images/icon.ico",
        "entry": "obj/bundle.js",
        "license": "../LICENSE.md"
    };
    static nexeOptions = {
        "input": Compiler.buildOptions.entry,
        "output": `${Compiler.buildOptions.tmp.dir}${Compiler.buildOptions.tmp.exe}`,
        "build": false,
        "plugins": [Compiler.rcedit]
    };

    static async rcedit(compiler, next)
    {
        if (!compiler.options.build)
        {
            const rceditExe = process.arch === 'x64' ? 'rcedit-x64.exe' : 'rcedit.exe'
            const rcedit = path.resolve(__dirname, '../../node_modules/rcedit/bin/', rceditExe)
            const filepath = compiler.getNodeExecutableLocation(compiler.target);
            const command = `"${rcedit}" "${filepath}" --set-icon "${Compiler.buildOptions.icon}"`;

            console.log(`\n- Setting icon`);
            process.execSync(command);
        }

        return next();
    }

    static preBuild()
    {
        if (VFS.exists(Compiler.buildOptions.build.dir))
        {
            console.log("Old build detected, removing the file");
            VFS.removeDir(Compiler.buildOptions.build.dir);
        }
    }

    static async build()
    {
        return nexe.compile(Compiler.nexeOptions);
    }

    static postBuild()
    {
        VFS.createDir(Compiler.buildOptions.build.dir);
        VFS.copyFile(`${Compiler.buildOptions.tmp.dir}${Compiler.buildOptions.tmp.exe}`,
                     `${Compiler.buildOptions.build.dir}${Compiler.buildOptions.build.exe}`);

        if (VFS.exists(Compiler.buildOptions.tmp.dir))
        {
            VFS.removeDir(Compiler.buildOptions.tmp.dir);
        }

        // only copy files with json extension (no .gitignore or .dvc)
        VFS.copyDir("assets/", `${Compiler.buildOptions.build.dir}Aki_Data/Server/`, ["json", "png", "ico"]);
        // VFS.minifyAllJsonInDirRecursive(`${Compiler.buildOptions.build.dir}Aki_Data/Server/`);

        if (VFS.exists(Compiler.buildOptions.license))
        {
            VFS.copyFile(Compiler.buildOptions.license, `${Compiler.buildOptions.build.dir}LICENSE-Server.txt`);
        }
        else
        {
            console.error("WARNING! LICENSE.md file not found. If you're making a release, please don't forget to include the license file!");
        }
    }

    static async run()
    {
        Compiler.preBuild();
        await Compiler.build();
        Compiler.postBuild();
    }
}

Compiler.run();

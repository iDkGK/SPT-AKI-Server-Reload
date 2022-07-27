"use strict";

require("../Lib.js");

const fs = require("fs");
const path = require("path");
const atomicW = require("atomically");
const lockfile = require("proper-lockfile");

class VFS
{
    static exists(filepath)
    {
        return fs.existsSync(filepath);
    }

    static rename(filepath, target)
    {
        fs.renameSync(filepath, target);
    }

    static copyFile(filepath, target)
    {
        fs.copyFileSync(filepath, target);
    }

    static createDir(filepath)
    {
        fs.mkdirSync(filepath.substr(0, filepath.lastIndexOf("/")), {
            recursive: true,
        });
    }

    static lockFileSync(filepath)
    {
        lockfile.lockSync(filepath);
    }

    static checkFileSync(filepath)
    {
        return lockfile.checkSync(filepath);
    }

    static unlockFileSync(filepath)
    {
        lockfile.unlockSync(filepath);
    }

    static copyDir(filepath, target, fileExtensions)
    {
        const files = VFS.getFiles(filepath);
        const dirs = VFS.getDirs(filepath);

        if (!VFS.exists(target))
        {
            VFS.createDir(`${target}/`);
        }

        for (const dir of dirs)
        {
            VFS.copyDir(
                path.join(filepath, dir),
                path.join(target, dir),
                fileExtensions
            );
        }

        for (const file of files)
        {
            // copy all if fileExtension is not set, copy only those with fileExtension if set
            if (
                !fileExtensions ||
                fileExtensions.includes(file.split(".").pop())
            )
            {
                VFS.copyFile(
                    path.join(filepath, file),
                    path.join(target, file)
                );
            }
        }
    }

    static readFile(filepath)
    {
        return fs.readFileSync(filepath);
    }

    static writeFile(filepath, data = "", append = false, atomic = true)
    {
        const options = append ? { flag: "a" } : { flag: "w" };

        if (!VFS.exists(filepath))
        {
            VFS.createDir(filepath);
            fs.writeFileSync(filepath, "");
        }

        VFS.lockFileSync(filepath);

        if (!append && atomic)
        {
            atomicW.writeFileSync(filepath, data);
        }
        else
        {
            fs.writeFileSync(filepath, data, options);
        }

        if (VFS.checkFileSync(filepath))
        {
            VFS.unlockFileSync(filepath);
        }
    }

    static getFiles(filepath)
    {
        return fs.readdirSync(filepath).filter(item =>
        {
            return fs.statSync(path.join(filepath, item)).isFile();
        });
    }

    static getDirs(filepath)
    {
        return fs.readdirSync(filepath).filter(item =>
        {
            return fs.statSync(path.join(filepath, item)).isDirectory();
        });
    }

    static removeFile(filepath)
    {
        fs.unlinkSync(filepath);
    }

    static removeDir(filepath)
    {
        const files = VFS.getFiles(filepath);
        const dirs = VFS.getDirs(filepath);

        for (const dir of dirs)
        {
            VFS.removeDir(path.join(filepath, dir));
        }

        for (const file of files)
        {
            VFS.removeFile(path.join(filepath, file));
        }

        fs.rmdirSync(filepath);
    }

    static explodePath(filepath)
    {
        return filepath.split("/");
    }

    static getFileExtension(filepath)
    {
        return filepath.split(".").pop();
    }

    static stripExtension(filepath)
    {
        return filepath.split(".").slice(0, -1).join(".");
    }

    static minifyAllJsonInDirRecursive(filepath)
    {
        const files = VFS.getFiles(filepath).filter(
            item => VFS.getFileExtension(item) === "json"
        );
        for (const file of files)
        {
            const filePathAndName = path.join(filepath, file);
            const minified = JSON.stringify(
                JSON.parse(VFS.readFile(filePathAndName))
            );
            VFS.writeFile(filePathAndName, minified);
        }

        const dirs = VFS.getDirs(filepath);
        for (const dir of dirs)
        {
            VFS.minifyAllJsonInDirRecursive(path.join(filepath, dir));
        }
    }
}

module.exports = VFS;

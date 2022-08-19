"use strict";

require("../Lib.js");

const fs = require("fs");
const lockfile = require("proper-lockfile");
const path = require("path");
const util = require("util");

class VFS
{
    static get accessFilePromisify()
    {
        return util.promisify(fs.access);
    }

    static get copyFilePromisify()
    {
        return util.promisify(fs.copyFile);
    }

    static get mkdirPromisify()
    {
        return util.promisify(fs.mkdir);
    }

    static get readFilePromisify()
    {
        return util.promisify(fs.readFile);
    }

    static get writeFilePromisify()
    {
        return util.promisify(fs.writeFile);
    }

    static get readdirPromisify()
    {
        return util.promisify(fs.readdir);
    }

    static get statPromisify()
    {
        return util.promisify(fs.stat);
    }

    static get unlinkPromisify()
    {
        return util.promisify(fs.unlinkSync);
    }

    static get rmdirPromisify()
    {
        return util.promisify(fs.rmdir);
    }

    static exists(filepath)
    {
        return fs.existsSync(filepath);
    }

    static async existsSync(filepath)
    {
        try
        {
            const command = {
                uuid: UUidGenerator.generate(),
                cmd: async () => await VFS.accessFilePromisify(filepath),
            };
            await AsyncQueue.waitFor(command);
            return true;
        }
        catch
        {
            return false;
        }
    }

    static copyFile(filepath, target)
    {
        fs.copyFileSync(filepath, target);
    }

    static async copyAsync(filepath, target)
    {
        const command = {
            uuid: UUidGenerator.generate(),
            cmd: async () => await VFS.copyFilePromisify(filepath, target),
        };
        await AsyncQueue.waitFor(command);
    }

    static createDir(filepath)
    {
        fs.mkdirSync(filepath.substr(0, filepath.lastIndexOf("/")), {
            recursive: true,
        });
    }

    static async createDirAsync(filepath)
    {
        const command = {
            uuid: UUidGenerator.generate(),
            cmd: async () =>
                await VFS.mkdirPromisify(
                    filepath.substr(0, filepath.lastIndexOf("/")),
                    { recursive: true }
                ),
        };
        await AsyncQueue.waitFor(command);
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

    static async copyDirAsync(filepath, target, fileExtensions)
    {
        const files = VFS.getFiles(filepath);
        const dirs = VFS.getDirs(filepath);
        if (!(await VFS.existsAsync(target)))
        {
            await VFS.createDirAsync(`${target}/`);
        }

        for (const dir of dirs)
        {
            await VFS.copyDirAsync(
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
                await VFS.copyAsync(
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

    static async readFileAsync(filepath)
    {
        const command = {
            uuid: UUidGenerator.generate(),
            cmd: async () => await VFS.readFile(filepath),
        };
        await AsyncQueue.waitFor(command);
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
            fs.writeFileSync(filepath, data);
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

    static async writeFileAsync(
        filepath,
        data = "",
        append = false,
        atomic = true
    )
    {
        const options = append ? { flag: "a" } : { flag: "w" };
        if (!(await VFS.exists(filepath)))
        {
            await VFS.createDir(filepath);
            await VFS.writeFilePromisify(filepath, "");
        }

        if (!append && atomic)
        {
            await VFS.writeFilePromisify(filepath, data);
        }
        else
        {
            await VFS.writeFilePromisify(filepath, data, options);
        }
    }

    static getFiles(filepath)
    {
        return fs.readdirSync(filepath).filter(item =>
        {
            return fs.statSync(path.join(filepath, item)).isFile();
        });
    }

    static async getFilesAsync(filepath)
    {
        const addr = await VFS.readdirPromisify(filepath);
        return addr.filter(async item =>
        {
            const stat = await VFS.statPromisify(path.join(filepath, item));
            return stat.isFile();
        });
    }

    static getDirs(filepath)
    {
        return fs.readdirSync(filepath).filter(item =>
        {
            return fs.statSync(path.join(filepath, item)).isDirectory();
        });
    }

    static async getDirsAsync(filepath)
    {
        const addr = await VFS.readdirPromisify(filepath);
        return addr.filter(async item =>
        {
            const stat = await VFS.statPromisify(path.join(filepath, item));
            return stat.isDirectory();
        });
    }

    static removeFile(filepath)
    {
        fs.unlinkSync(filepath);
    }

    static async removeFileAsync(filepath)
    {
        await VFS.unlinkPromisify(filepath);
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

    static async removeDirAsync(filepath)
    {
        const files = VFS.getFiles(filepath);
        const dirs = VFS.getDirs(filepath);
        const promises = [];
        for (const dir of dirs)
        {
            promises.push(VFS.removeDirAsync(path.join(filepath, dir)));
        }

        for (const file of files)
        {
            promises.push(VFS.removeFile(path.join(filepath, file)));
        }
        await Promise.all(promises);
        await VFS.rmdirPromisify(filepath);
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

    static async minifyAllJsonInDirRecursiveAsync(filepath)
    {
        const files = VFS.getFiles(filepath).filter(
            item => VFS.getFileExtension(item) === "json"
        );
        for (const file of files)
        {
            const filePathAndName = path.join(filepath, file);
            const minified = JSON.stringify(
                JSON.parse(await VFS.readFile(filePathAndName))
            );
            await VFS.writeFile(filePathAndName, minified);
        }
        const dirs = VFS.getDirs(filepath);
        const promises = [];
        for (const dir of dirs)
        {
            promises.push(
                VFS.minifyAllJsonInDirRecursive(path.join(filepath, dir))
            );
        }
        await Promise.all(promises);
    }

    static getFilesOfType(directory, fileType, files = [])
    {
        // no dir so exit early
        if (!fs.existsSync(directory))
        {
            return files;
        }

        const dirents = fs.readdirSync(directory, {
            encoding: "utf-8",
            withFileTypes: true,
        });
        for (const dirent of dirents)
        {
            const res = resolve(directory, dirent.name);
            if (dirent.isDirectory())
            {
                VFS.getFilesOfType(res, fileType, files);
            }
            else
            {
                if (res.endsWith(fileType))
                {
                    files.push(res);
                }
            }
        }
        return files;
    }
}

module.exports = VFS;

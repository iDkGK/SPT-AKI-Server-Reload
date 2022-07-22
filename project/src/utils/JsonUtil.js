"use strict";

require("../Lib.js");

const fixJson = require("json-fixer");

class JsonUtil
{
    static fileHashes = null;

    static serialize(data, prettify = false)
    {
        if (prettify)
        {
            return JSON.stringify(data, null, "\t");
        }
        else
        {
            return JSON.stringify(data);
        }
    }

    static deserialize(s)
    {
        const { data, changed } = fixJson(`${s}`);
        if (changed)
        {
            Logger.error("Detected faulty json, please fix your json file using VSCodium");
        }

        return data;
    }

    static deserializeWithCacheCheck(jsonString, filePath)
    {
        // get json cache file and ensure it exists, create if it doesnt
        const jsonCachePath = "./user/cache/jsonCache.json";
        if (!VFS.exists(jsonCachePath))
        {
            VFS.writeFile(jsonCachePath, "{}");
        }

        // Generate hash of string
        const generatedHash = HashUtil.generateSha1ForData(jsonString);

        // Get all file hashes
        if (!JsonUtil.fileHashes)
        {
            JsonUtil.fileHashes = JsonUtil.deserialize(VFS.readFile(`${jsonCachePath}`));
        }

        // Get hash of file and check if missing or hash mismatch
        let savedHash = JsonUtil.fileHashes[filePath];
        if (!savedHash || savedHash !== generatedHash)
        {
            const { data, changed } = fixJson(`${jsonString}`);
            if (changed) // data invalid, return it
            {
                Logger.error(`${filePath} - Detected faulty json, please fix your json file using VSCodium`);
                return data;
            }
            else
            {
                // data valid, save hash and call function again
                JsonUtil.fileHashes[filePath] = generatedHash;
                VFS.writeFile(jsonCachePath, JsonUtil.serialize(JsonUtil.fileHashes, true));
                savedHash = generatedHash;
            }
        }

        // Doesn't match
        if (savedHash !== generatedHash)
        {
            throw new Error(`Catastrophic failure processing file ${filePath}`);
        }

        // Match!
        return JSON.parse(jsonString);
    }

    static clone(data)
    {
        return JSON.parse(JSON.stringify(data));
    }
}

module.exports = JsonUtil;

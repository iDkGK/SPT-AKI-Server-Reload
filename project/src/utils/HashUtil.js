"use strict";

require("../Lib.js");

const crypto = require("crypto");

class HashUtil
{
    static generate()
    {
        const shasum = crypto.createHash("sha1");
        const time = Math.random() * TimeUtil.getTimestamp();

        shasum.update(time.toString());
        return shasum.digest("hex").substring(0, 24);
    }

    static generateMd5ForData(data)
    {
        return HashUtil.generateHashForData("md5", data);
    }

    static generateSha1ForData(data)
    {
        return HashUtil.generateHashForData("sha1", data);
    }

    static generateHashForData(algorithm, data)
    {
        const hashSum = crypto.createHash(algorithm);
        hashSum.update(data);
        return hashSum.digest("hex");
    }
}

module.exports = HashUtil;

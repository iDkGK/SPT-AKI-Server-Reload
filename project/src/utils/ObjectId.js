"use strict";

require("../Lib.js");

const crypto = require("crypto");

class ObjectId
{
    static incGlobalCounter()
    {
        return (ObjectId.globalCounter = (ObjectId.globalCounter + 1) % 0xffffff);
    }

    static toHexString(byteArray)
    {
        let hexString = "";
        for (let i = 0; i < byteArray.length; i++)
        {
            hexString += ("0" + (byteArray[i] & 0xFF).toString(16)).slice(-2);
        }
        return hexString;
    }

    static generate()
    {
        const time = TimeUtil.getTimestamp();
        if (ObjectId.time !== time)
        {
            ObjectId.globalCounter = 0;
            ObjectId.time = time;
        }
        const counter = ObjectId.incGlobalCounter();
        const objectIdBinary = Buffer.alloc(12);

        objectIdBinary[3] = time & 0xff;
        objectIdBinary[2] = (time >> 8) & 0xff;
        objectIdBinary[1] = (time >> 16) & 0xff;
        objectIdBinary[0] = (time >> 24) & 0xff;
        objectIdBinary[4] = ObjectId.randomBytes[0];
        objectIdBinary[5] = ObjectId.randomBytes[1];
        objectIdBinary[6] = ObjectId.randomBytes[2];
        objectIdBinary[7] = ObjectId.randomBytes[3];
        objectIdBinary[8] = ObjectId.randomBytes[4];
        objectIdBinary[9] = (counter >> 16) & 0xff;
        objectIdBinary[10] = (counter >> 8) & 0xff;
        objectIdBinary[11] = counter & 0xff;

        return ObjectId.toHexString(objectIdBinary);
    }
}

ObjectId.randomBytes = crypto.randomBytes(5);
ObjectId.globalCounter = 0;
ObjectId.time = 0;

module.exports = ObjectId;
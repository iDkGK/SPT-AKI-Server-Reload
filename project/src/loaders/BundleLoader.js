"use strict";

require("../Lib.js");

class BundleInfo
{
    constructor(modpath, bundle)
    {
        this.key = bundle.key;
        this.path = `${HttpServer.getBackendUrl()}/files/bundle/${bundle.key}`;
        this.filepath = bundle.path || `${process.cwd()}/${modpath}bundles/${bundle.key}`.replace(/\\/g, "/");
        this.dependencyKeys = bundle.dependencyKeys || [];
    }
}

class BundleLoader
{
    static bundles = {};

    static getBundles(local)
    {
        const result = [];

        for (const bundle in BundleLoader.bundles)
        {
            result.push(BundleLoader.getBundle(bundle, local));
        }

        return result;
    }

    static getBundle(key, local)
    {
        const bundle = JsonUtil.clone(BundleLoader.bundles[key]);

        if (local)
        {
            bundle.path = bundle.filepath;
        }

        delete bundle.filepath;
        return bundle;
    }

    static addBundles(modpath)
    {
        const manifest = JsonUtil.deserialize(VFS.readFile(`${modpath}bundles.json`)).manifest;

        for (const bundle of manifest)
        {
            BundleLoader.bundles[bundle.key] = new BundleInfo(modpath, bundle);
        }
    }
}

module.exports = BundleLoader;
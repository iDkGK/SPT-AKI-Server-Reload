"use strict";

require("../Lib.js");

class BundleInfo
{
    modPath;
    key;
    path;
    filepath;
    dependencyKeys;

    constructor(modpath, bundle, bundlePath, bundleFilepath)
    {
        this.modPath = modpath;
        this.key = bundle.key;
        this.path = bundlePath;
        this.filepath = bundleFilepath;
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
        const manifest = JsonUtil.deserialize(
            VFS.readFile(`${modpath}bundles.json`)
        ).manifest;

        for (const bundle of manifest)
        {
            const bundlePath = `${HttpServerHelper.getBackendUrl()}/files/bundle/${
                bundle.key
            }`;
            const bundleFilepath =
                bundle.path ||
                `${modpath}bundles/${bundle.key}`.replace(/\\/g, "/");
            BundleLoader.bundles[bundle.key] = new BundleInfo(
                modpath,
                bundle,
                bundlePath,
                bundleFilepath
            );
        }
    }
}

module.exports = BundleLoader;

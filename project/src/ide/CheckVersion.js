const semver = require("semver");

const version = "v16.17.0";

if (semver.satisfies(process.version, version)) {
    console.log("Your node version is correct.");
} else {
    console.log(`Server requires node version ${version}`);
    console.log(`Your version is ${process.version}`);

    if (globalThis.G_RELEASE_CONFIGURATION) {
        process.exit(1);
    }

    console.log("Dev build, continuing...");
}

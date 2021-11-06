/*
    Experimental autofetcher/updater that fetches and updates tweetdeck's JS
*/

const https = require("https");
const fs = require("fs");

let pageContent = "";

let noWrite = false;

console.log("  Starting TweetDeck Decompiler - Fetcher (Gryphon)");
console.log("  Contacting tweetdeck.twitter.com...");

function processPage() {

    try {
	    fs.mkdirSync("./sources_gryphon")
    } catch(e) {
    }

    pageContent.match(/https:\/\/[\w\.\d\/\-\%\~]+\.js/g).forEach((a) => {
        var data = "";
        console.log("  Found JS file " + a + " on page.");

        let fileName = a.match(/(?<=\.com\/)[\w\d\.\-\/\~]+\.js/g)[0];

        let folder = fileName.split("/");
        folder.pop();
        folder = folder.join("/");

        fs.mkdirSync("./sources_gryphon/" + folder, { recursive: true });


        https.get(a, (res) => {
            res.on("data", (d) => {
                data += d;
            });
            res.on("end", () => {
                console.log("  Writing file " + fileName);
                if (!noWrite)
                    fs.writeFileSync("./sources_gryphon/" + fileName, data);

                if (fileName.match("bundle") !== null && !noWrite) {
                    stealDependencies(data);
                }
            });
        });

    });
}

function stealDependencies(bundleJs) {
    let o = [];
    let p = [];

    var whatever = true;

    bundleJs.match(/(?<=\+\"web\/dist\/\"\+\()[\:\,\"\d\w\(\)\{\}\~\.\-\[\]\|\+]+\}(?=\[.\]\+\"\.js\"\})/g)[0]
    .match(/\{[\w\.\:\"\~\-\,]+\}/g).forEach((json) => {
        let object = JSON.parse(json.replace(/(?<=[\,\{]\d?\d?)(?=\d?\d?[\:])/g,"\"").replace(/(?<=\d)\"(?=\d)/g,""));
        if (whatever) {
            for (var a in object) {
                o.push(object[a]);
            }
        } else {
            for (var b in object) {
                p.push(object[b]);
            }
        }
        whatever = false;
    })

    o.forEach((asdf, i) => {
        console.log("  Fetching additional JS file " + o[i] + "." + p[i] + ".js");
        let data = "";
        let fileName = o[i] + "." + p[i] + ".js";
        let baseURL = "https://ton.twimg.com/tweetdeck-web/web/dist/";
        https.get(baseURL + fileName, (res) => {
            res.on("data", (d) => {
                data += d;
            });
            res.on("end", () => {
                console.log("  Writing file " + fileName);
                fs.writeFileSync("./sources_gryphon/" + fileName, data);

                if (fileName.match("bundle") !== null) {
                    stealDependencies(data);
                }
            });
        });

    })
}

https.get("https://tweetdeck.twitter.com", { headers: { Cookie: "tweetdeck_version=beta;"} }, (res) => {
    console.log("  Loading tweetdeck.twitter.com...");
    res.on("data", (d) => {
        pageContent += d+""; // lazy cast to string
    });

    res.on("end", () => processPage(pageContent));
});
/*
    Experimental autofetcher/updater that fetches and updates tweetdeck's JS
*/

const https = require("https");
const fs = require("fs");

let pageContent = "";

console.log("  Starting TweetDeck Decompiler - Fetcher");
console.log("  Contacting tweetdeck.twitter.com...");

function processPage() {
    let jsFiles = [];

    try {
	    for (const file of fs.readdirSync("./sources")) {
		    fs.unlinkSync(path.join("./sources", file));
	    }
    } catch(e) {}

    try {
	    fs.mkdirSync("./sources")
    } catch(e) {
    }

    pageContent.match(/https:\/\/[\w\.\d\/\-\%]+\.js/g).forEach((a) => {
        var data = "";
        console.log("  Found JS file " + a + " on page.");

        let fileName = a.match(/[\w\d\.\-]+\.js/g)[0];

        https.get(a, (res) => {
            res.on("data", (d) => {
                data += d;
            });
            res.on("end", () => {
                console.log("  Writing file " + fileName);
                fs.writeFileSync("./sources/" + fileName, data);

                if (fileName.match("bundle") !== null) {
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
                fs.writeFileSync("./sources/" + fileName, data);

                if (fileName.match("bundle") !== null) {
                    stealDependencies(data);
                }
            });
        });

    })
}

https.get("https://tweetdeck.twitter.com", (res) => {
    console.log("  Loading tweetdeck.twitter.com...");
    res.on("data", (d) => {
        pageContent = d+""; // lazy cast to string
        processPage();
    });
});

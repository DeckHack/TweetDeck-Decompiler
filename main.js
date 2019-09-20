/*
	TweetDeck Decompiler
	Made with <3 by dangeredwolf, DeckHack, et al.
	Released under MIT license
*/

/* Useful flags */

let unpackedDir = "unpacked";     /* Directory to unpack to, local to project */
let beautifyModules = true;       /* Formats modules with whitespacing, newlines, etc */
let commentAlert = true;          /* Alerts you if any obfuscated modules contain comments.
                                     These can be useful to figure out what they do.
							  Note: This can trigger some false positives. */
let debug = false;                /* Prints out a ton of debug console.logs. Use only if you need to. */
let maximumShownDeps = 20;        /* Maximum shown dependencies within the flags. Default is 20.
                                     This is very useful for modules like jQuery where hundreds of modules depend on it. */

/* Scary code begins here */

const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const unpacker = require("webpack-unpack");
const { Deobfuscator } = require("./deobfuscator.js");
const ProgressBar = require('progress');

let deobfuscatedFunctions = {};
let requirementMap = {};
let deobfMap = {};
let modulesFound = [];

let hasUnpackedAnything = false;

/*
	Helper function that saves the module passed in argument 1
*/

function saveModule(mod, loc) {

	hasUnpackedAnything = true;

	let source = mod.source;
	let saveAs = "m" + mod.id + ".js";

	let deobfuscated = Deobfuscator.run(source, mod.id);

	modulesFound.push(mod.id);

	if (deobfuscated !== null) {
		if (debug) {
			console.log("DEOBFUSCATED " + mod.id + " -> " + deobfuscated);
		}
		deobfuscatedFunctions[mod.id] = deobfuscated;
		saveAs = deobfuscated;
		deobfMap[deobfuscated] = mod.id;
	}

	let header = "/*\n\t" + saveAs + " (Module " + mod.id + ")\n\tExtracted from " + loc + ".js\n\tGenerated by TweetDeck Decompiler\n\n"

	var increment = 0;

	for (var dep in mod.deps) {
		if (increment < maximumShownDeps) {
			theDep = deobfuscatedFunctions[dep] || "m" + dep + ".js";
			header += "\tRequires " + theDep + "\n";
			if (debug) {
				console.log("Module " + mod.id + " depends on " + dep);
			}
		}

		if (typeof requirementMap[dep] === "undefined") {
			if (debug) {
				console.log("Creating requirement Map for " + dep);
			}
			requirementMap[dep] = []
		}

		if (debug) {
			console.log("Pushing " + saveAs + " to requirement map for " + dep);
		}

		requirementMap[dep].push(saveAs);
		increment++;
	}

	if (increment > maximumShownDeps) {
		header += "\t... and " + (increment - maximumShownDeps) + " others\n"
	}
	header += "\n\t[**DECOMPILER_RENDER_DEPENDENCY_MAP**]\n";

	source = header + "*/\n\n" + source;
	source = source.replace(/(?<=require)\((?=\d{0,4}\))/g,"(\"./m").replace(/(?<=require\(\"(\.\/)m\d{0,4})\)/g,".js\")");


	if (debug) {
		console.log("Writing file " + unpackedDir + "/" + saveAs);
	}

	let asdf = fs.writeFileSync(unpackedDir + "/" + saveAs, source);

	if (debug) {
		console.log("writeFileSync: "+ asdf);
	}
	// console.log("Saved " + (loc ? loc + " " : "") + "module " + saveAs);

}

function unpackerHelper(file, name) {
	let unpacked = unpacker(fs.readFileSync("./" + file));
	var bar = new ProgressBar("  Unpacking " + name + " [:bar] :percent", {
	    complete: "=",
	    incomplete: " ",
	    width: 40,
	    total: unpacked.length
	});
	unpacked.forEach(mod => {
		bar.tick();
		saveModule(mod, name);
	});
}

function unpack() {

	// Remove previously saved modules
	try {
		for (const file of fs.readdirSync(unpackedDir)) {
			fs.unlinkSync(path.join(unpackedDir, file));
		}
		// fs.rmdirSync(unpackedDir);
	} catch(e) {}

	try {
		fs.mkdirSync(unpackedDir);
	} catch(e) {
		// fs.mkdirSync(unpackedDir); // If at first you don't succeed, try again
	}

	/* Logic to detect TweetDeck JS files in project directory */

	for (var file of fs.readdirSync("./")) {

		if (debug) {
			console.log("Found file " + file);
		}

		if (file.match(/bundle(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "bundle");
		} else if (file.match(/vendor(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "vendor");
		} else if (file.match(/vendors\~mapbox(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "vendors~mapbox");
		} else if (file.match(/mapbox(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "mapbox");
		} else if (file.match(/ondemand\.horizon\-web(\.[a-f0-9\-\.js]+)?\.js/g) !== null) {
			unpackerHelper(file, "ondemand.horizon-web");
		}
	}

	Deobfuscator.checkIfAllWereReplaced();

	// we need to have something to unpack.
	// maybe one day we can automatically pull from tweetdeck.twitter.com

	if (!hasUnpackedAnything) {
		console.error("\n  It doesn't seem like we had anything to unpack.");
		console.log("  Copy the corresponding TweetDeck JS files (bundle, vendor, mapbox, vendors~mapbox) to this project's root directory\n");
	}

	if (beautifyModules) {

		console.log("\n  Beautifying modules...\n");

		exec("js-beautify " + unpackedDir + "/*.js", (err, stdout, stderr) => {
			if (err) {
				throw err;
			}
		})
	}
	console.log("  Resolving dependencies... This may take a moment.\n"); // MAY???

	if (debug) {
		console.log("Reading files of " + unpackedDir);
	}

	let pleaseReadDir = fs.readdirSync(unpackedDir);

	var bar = new ProgressBar("  Resolving dependencies [:bar] :percent", {
	    complete: "=",
	    incomplete: " ",
	    width: 40,
	    total: pleaseReadDir.length
	});

	for (const file of pleaseReadDir) {
		if (debug) {
			console.log("Checking file " + file);
		}
		var source = fs.readFileSync(path.join(unpackedDir, file))+"";
		var originalSource = source;
		var requireRegex = /(?<=(require\([\"\']\.\/)|(\tRequires ))m\d+\.js(?=([\"\']\)|\n))/g;
		var requirements = source.match(requireRegex) || [];

		requirements.forEach(requirement => {
			let func = deobfuscatedFunctions[requirement.match(/\d+/g)[0]];
			if (typeof func !== "undefined") {
				if (debug) {
					console.log("We found " + requirement + " and are replacing it with " + func);
				}
				source = source.replace(requirement, func)
			}
		})

		let ID = (typeof deobfMap[file] != "undefined") ? deobfMap[file] : parseInt(file.match(/\d+/g)[0]);

		if (typeof requirementMap[ID] === "undefined") {
			source = source.replace(/\n\t\[\*\*DECOMPILER_RENDER_DEPENDENCY_MAP\*\*\]/g, "")
		} else {
			let dependedOnBy = "";
			var increment = 0;
			requirementMap[ID].forEach(requiredThing => {
				if (increment < 20)
					dependedOnBy += "\tDepended on by " + (deobfuscatedFunctions[requiredThing] || requiredThing) + "\n";
				increment++;
			})
			if (increment > 20) {
				dependedOnBy += "\t... and " + (increment - 20) + " others";
			}
			source = source.replace(/\t\[\*\*DECOMPILER_RENDER_DEPENDENCY_MAP\*\*\]/g, dependedOnBy)
		}

		// Why write again if it's the same?
		if (originalSource !== source) {
			let fileOperation = fs.writeFileSync(unpackedDir + "/" + file, source);

			if (debug) {
				console.log(fileOperation)
			}
		}

		bar.tick(); // make the progress bar go
	}
	finishThingsUp();

}

function finishThingsUp() {
	// let modulesFoundCount = modulesFound.length;
	// let modulesExpected = modulesFound[modulesFound.length - 1];

	// console.log("Found " + modulesFoundCount + ", expected " + modulesExpected)

	Deobfuscator.printDeobfCount(); // Hey deobfuscator, how did things go? Good, I hope!

	console.log("\n  Waiting for all file operations to complete...\n");
}

console.log("  Starting TweetDeck Decompiler\n");

unpack();

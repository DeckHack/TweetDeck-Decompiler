const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const unpacker = require("webpack-unpack");
const { deobfuscator } = require("./deobfuscator.js");
const ProgressBar = require('progress');

let unpackedDir = "unpacked";
let hasUnpackedAnything = false;
let beautifyModules = true;
let commentAlert = true;

let deobfuscatedFunctions = {};
let requirementMap = {};
let deobfMap = {};

/*
	Helper function that saves the module passed in argument 1
*/

function saveModule(mod, loc) {

	hasUnpackedAnything = true;

	let header = "/*\n\tModule " + mod.id + "\n\tExtracted from " + loc + ".js\n\tGenerated by TweetDeck Decompiler\n\n"

	let source = mod.source;
	let saveAs = "m" + mod.id + ".js";

	let deobfuscated = deobfuscator(source);

	if (deobfuscated !== null) {
		deobfuscatedFunctions[mod.id] = deobfuscated;
		saveAs = deobfuscated;
		deobfMap[deobfuscated] = mod.id;
	}

	var increment = 0;

	for (var dep in mod.deps) {
		if (increment < 20) {
			theDep = deobfuscatedFunctions[dep] || "m" + dep + ".js";
			header += "\tRequires " + theDep + "\n";
		}

		if (typeof requirementMap[dep] === "undefined") {
			requirementMap[dep] = []
		}

		requirementMap[dep].push(dep);
		increment++;
	}

	if (increment > 20) {
		header += "\t... and " + (increment - 20) + " others\n"
	}
	header += "\n\t[**DECOMPILER_RENDER_DEPENDENCY_MAP**]\n";

	source = header + "*/\n\n" + source;
	source = source.replace(/(?<=require)\((?=\d{0,4}\))/g,"(\"./m").replace(/(?<=require\(\"(\.\/)m\d{0,4})\)/g,".js\")");

	fs.writeFileSync(unpackedDir + "/" + saveAs, source);
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
		fs.rmdirSync(unpackedDir);
	} catch(e) {}

	try {
		fs.mkdirSync(unpackedDir);
	} catch(e) {
		fs.mkdirSync(unpackedDir); // If at first you don't succeed, try again
	}

	for (const file of fs.readdirSync("./")) {
		if (file.match(/bundle(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "bundle");
		}
		if (file.match(/vendor(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "vendor");
		}
		if (file.match(/mapbox(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "mapbox");
		}
		if (file.match(/vendors\~mapbox(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "vendors~mapbox");
		}
	}

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
	console.log("  Resolving dependencies... This may take a moment.\n");

	let pleaseReadDir = fs.readdirSync(unpackedDir);

	var bar = new ProgressBar("  Resolving dependencies [:bar] :percent", {
	    complete: "=",
	    incomplete: " ",
	    width: 40,
	    total: pleaseReadDir.length
	});

	for (const file of pleaseReadDir) {
		var source = fs.readFileSync(path.join(unpackedDir, file))+"";
		var originalSource = source;
		var requireRegex = /(?<=(require\([\"\']\.\/)|(\tRequires ))m\d+\.js(?=([\"\']\)|\n))/g;
		var requirements = source.match(requireRegex) || [];

		requirements.forEach(requirement => {
			let func = deobfuscatedFunctions[requirement.match(/\d+/g)[0]];
			if (typeof func !== "undefined") {
				source = source.replace(requirement, func)
			}
		})

		let ID = (typeof deobfMap[file] != "undefined") ? deobfMap[file] : file.match(/\d+/g)[0];

		if (typeof requirementMap[ID] === "undefined") {
			source = source.replace(/\n\t\[\*\*DECOMPILER_RENDER_DEPENDENCY_MAP\*\*\]/g, "")
		} else {
			let dependedOnBy = "";
			var increment = 0;
			requirementMap[ID].forEach(requiredThing => {
				console.log(requiredThing);
				if (increment < 20)
					dependedOnBy += "\tDepended on by " + (deobfuscatedFunctions[requiredThing] || "m"+requiredThing+".js") + "\n";
				increment++;
			})
			if (increment > 20) {
				dependedOnBy += "\t... and " + (increment - 20) + " others";
			}
			source = source.replace(/\t\[\*\*DECOMPILER_RENDER_DEPENDENCY_MAP\*\*\]/g, dependedOnBy)
		}

		if (originalSource !== source) {
			fs.writeFileSync(unpackedDir + "/" + file, source);
		}

		bar.tick();
	}
	console.log("\n  Waiting for all file operations to complete...\n");
	process.exit(0);

}

console.log("  Starting TweetDeck Decompiler\n");

unpack();

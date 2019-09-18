const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const unpacker = require("webpack-unpack");
const { deobfuscator } = require("./deobfuscator.js");

let unpackedDir = "unpacke";
let hasUnpackedAnything = false;
let beautifyModules = false;

let deobfuscatedFunctions = {};

/*
	Helper function that saves the module passed in argument 1
*/

function saveModule(mod, loc) {

	hasUnpackedAnything = true;

	let header = "/*\n\tModule " + mod.id + "\n\tExtracted from " + loc + ".js\n\tGenerated by TweetDeck Disassembler\n\n"

	let source = mod.source;
	let saveAs = "m" + mod.id + ".js";

	let deobfuscated = deobfuscator(source);

	if (deobfuscated !== null) {
		deobfuscatedFunctions[mod.id] = deobfuscated;
		saveAs = deobfuscated;
	}

	for (var dep in mod.deps) {
		theDep = deobfuscatedFunctions[dep] || "m" + dep + ".js";
		header += "\tRequires " + theDep + "\n";
	}

	source = header + "*/\n\n" + source;
	source = source.replace(/(?<=require)\((?=\d{0,4}\))/g,"(\"./m").replace(/(?<=require\(\"(\.\/)m\d{0,4})\)/g,".js\")");

	fs.writeFileSync(unpackedDir + "/" + saveAs, source);
	console.log("Saved " + (loc ? loc + " " : "") + "module " + saveAs);

}

function unpack() {

	// Remove previously saved modules
	try {
		for (const file of fs.readdirSync(unpackedDir)) {
			fs.unlinkSync(path.join(unpackedDir, file));
		}
		fs.rmdirSync(unpackedDir);
	} catch(e) {}

	fs.mkdirSync(unpackedDir);

	for (const file of fs.readdirSync("./")) {
		if (file.match(/bundle(\.[a-f0-9]+)?\.js/g) !== null) {
			unpacker(fs.readFileSync("./" + file)).forEach(mod => saveModule(mod, "bundle"));
		}
		if (file.match(/vendor(\.[a-f0-9]+)?\.js/g) !== null) {
			unpacker(fs.readFileSync("./" + file)).forEach(mod => saveModule(mod, "vendor"));
		}
		if (file.match(/mapbox(\.[a-f0-9]+)?\.js/g) !== null) {
			unpacker(fs.readFileSync("./" + file)).forEach(mod => saveModule(mod, "mapbox"));
		}
		if (file.match(/vendors\~mapbox(\.[a-f0-9]+)?\.js/g) !== null) {
			unpacker(fs.readFileSync("./" + file)).forEach(mod => saveModule(mod, "vendors~mapbox"));
		}
	}

	if (!hasUnpackedAnything) {
		console.error("\nIt doesn't seem like we had anything to unpack.");
		console.log("Copy the corresponding TweetDeck JS files (bundle, vendor, mapbox, vendors~mapbox) to this project's root directory\n");
	}

	if (beautifyModules) {

		console.log("\nBeautifying modules... this may take a moment");

		exec("js-beautify " + unpackedDir + "/*.js", (err, stdout, stderr) => {
			if (err) {
				throw err;
			}
			process.exit(0);
		})
	}
	console.log("Resolving dependencies...");

	for (const file of fs.readdirSync(unpackedDir)) {
		var source = fs.readFileSync(path.join(unpackedDir, file))+"";
		var requireRegex = /(?<=(require\([\"\']\.\/)|(\tRequires ))m\d+\.js(?=([\"\']\)|\n))/g;
		var requirements = source.match(requireRegex) || [];

		requirements.forEach(requirement => {
			let func = deobfuscatedFunctions[requirement.match(/\d+/g)[0]];
			if (typeof func !== "undefined") {
				source = source.replace(requirement, func)
			}
		})
		fs.writeFileSync(unpackedDir + "/" + file, source);
	}

}

console.log("Starting TweetDeck Disassembler\n");

unpack();

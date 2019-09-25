/*
	TweetDeck Decompiler
	Made with <3 by dangeredwolf, DeckHack, et al.
	Released under MIT license
*/

/* Useful flags */

let unpackedDir = "unpacked_unformatted";/* Directory to unpack to, local to project */
let beautifiedDir = "unpacked";    /* Directory to unpack to, local to project */
let sourcesDir = "sources";        /* Directory to unpack to, local to project */
let beautifyModules = true;        /* Formats modules with whitespacing, newlines, etc */
let debug = false;                 /* Prints out a ton of debug console.logs. Use only if you need to. */
let maximumShownDeps = 20;         /* Maximum shown dependencies within the flags. Default is 20.
                                      This is very useful for modules like jQuery where hundreds of modules depend on it. */
let reportHoles = false;           /* Lets you know if there are any holes in the Module array ,
							   usually caused by missing files. */
let showParentOnUnknownModules=true/* Appends what script an unknown module is from to the name of the file for non-deobfuscated modules
							   NOTE: This WILL cause the process to take longer. */
let useFolderStructures = true;    /* Put different things in different folders and stuff */

/* Scary code begins here */

const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const unpacker = require("webpack-unpack");
const { Deobfuscator } = require("./deobfuscator.js");
const ProgressBar = require("progress");
const klawSync = require("klaw-sync");
const beautify = require("js-beautify").js;

let deobfuscatedFunctions = {};
let requirementMap = {};
let deobfMap = {};
let modulesFound = [];

let hasUnpackedAnything = false;

/*
	Helper function that saves the module passed along

	Object[module] mod - module object passed from webpack-unpack
	String loc - location: the filename of the JS file this module came from
*/

function saveModule(mod, loc) {

	hasUnpackedAnything = true;

	let source = mod.source;
	let saveAs = "m" + mod.id + ".js";

	/* Hook into Deobfuscator class */
	let deobfuscated = Deobfuscator.run(source, mod.id);

	modulesFound.push(mod.id);

	if (deobfuscated !== null) {
		if (debug) {
			console.log("DEOBFUSCATED " + mod.id + " -> " + deobfuscated);
		}

		/*
			If you aren't using folder structures, we'll replace what
			would be subdirectories with dots instead, to keep them organised that way.
		*/
		if (!useFolderStructures) {
			deobfuscated = deobfuscated.replace(/\//g,".")
		}

		deobfuscatedFunctions[mod.id] = deobfuscated;
		saveAs = deobfuscated;
		deobfMap[deobfuscated] = mod.id;

		let matchMePlease = deobfuscated.replace(/(?<!\/).[\w\.]+\.js/g,"") || deobfuscated;

		if (deobfuscated.split("/").length > 1 && useFolderStructures) {
			fs.mkdirSync(unpackedDir+"/"+matchMePlease, {recursive:true});
		}

	} else if (showParentOnUnknownModules) {

		let thing = "m" + mod.id + "_" + loc.replace(".js","") + ".js";
		saveAs = thing;
		deobfuscatedFunctions[mod.id] = thing;
		deobfMap[thing] = mod.id;
	}

	/* ah yes, terrible looking strings */
	let header = "/*\n\t" + saveAs + " (Module " + mod.id + ")\n\tExtracted from " + loc + ".js\n\tGenerated by TweetDeck Decompiler\n\n"

	var increment = 0;

	for (var dep in mod.deps) {
		/* Assuming we don't go over the maximum modules */
		if (increment < maximumShownDeps) {
			theDep = deobfuscatedFunctions[dep] || "m" + dep + ".js";
			header += "\tRequires " + theDep + "\n";
			if (debug) {
				console.log("Module " + mod.id + " depends on " + dep);
			}
		}

		if (typeof requirementMap[dep] === "undefined") {
			/* Do the debug statements make the code easier or harder to read?  */
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

	/* There's a lot, evidentally */
	if (increment > maximumShownDeps) {
		header += "\t... and " + (increment - maximumShownDeps) + " others\n"
	}

	header += "\n\t[**DECOMPILER_RENDER_DEPENDENCY_MAP**]\n";

	source = header + "*/\n\n" + source;
	source = source.replace(/(?<=require)\((?=\d{0,4}\))/g,"(\"./m").replace(/(?<=require\(\"(\.\/)m\d{0,4})\)/g,".js\")");


	if (debug) {
		console.log("Writing file " + saveAs);
	}

	let asdf = fs.writeFileSync("./" + unpackedDir + "/" + saveAs, source);

	if (debug) {
		console.log("writeFileSync: "+ asdf);
	}

}

/* Helper function for unpacking each file */
function unpackerHelper(file, name) {
	let unpacked = unpacker(fs.readFileSync(path.join(sourcesDir, file)));
	var bar = new ProgressBar("  Unpacking " + name + " [:bar] :percent", {
	    complete: "=",
	    incomplete: " ",
	    width: 30,
	    total: unpacked.length
	});
	unpacked.forEach(mod => {
		bar.tick();
		saveModule(mod, name);
	});
}

/* The primary function of TweetDeck Decompiler */

function unpack() {

	/* Remove previously saved modules */
	console.log("  Cleaning previous directories...\n");

	for (let i = 0; i < 9; i++) {
		for (const file of klawSync(unpackedDir, {nodir: true})) {
			try{fs.unlinkSync(file.path);}catch(e){}
		}
		for (const file of klawSync(beautifiedDir, {nodir: true})) {
			try{fs.unlinkSync(file.path);}catch(e){}
		}
		for (const file of klawSync(unpackedDir, {nofile: true})) {
			try{fs.rmdirSync(file.path, {recursive:true});}catch(e){}
		}
		for (const file of klawSync(beautifiedDir, {nofile: true})) {
			try{fs.rmdirSync(file.path, {recursive:true});}catch(e){}
		}
	}

	/* Make dirs if not yet available */

	try {fs.mkdirSync(unpackedDir)} catch(e) {}
	try {fs.mkdirSync(sourcesDir)} catch(e) {}
	try {fs.mkdirSync(beautifiedDir)} catch(e) {}

	/* Logic to detect TweetDeck JS files in project directory */

	for (var file of fs.readdirSync(sourcesDir)) {

		if (debug) {
			console.log("Found file " + file);
		}

		if (file.match(/bundle(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "bundle");
		} else if (file.match(/vendor(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "vendor");
		} else if (file.match(/vendors\~mapbox(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "vendors~mapbox");
		} else if (file.match(/vendors\~sentry(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "vendors~sentry");
		} else if (file.match(/vendors\~ondemand(\..+)?\.js/g) !== null) {
			unpackerHelper(file, "vendors~ondemand.horizon-web");
		} else if (file.match(/mapbox(\.[a-f0-9]+)?\.js/g) !== null) {
			unpackerHelper(file, "mapbox");
		} else if (file.match(/ondemand\.horizon\-web(\.[a-zGBH0-9\-\.]+)?\.js/g) !== null) {
			unpackerHelper(file, file.match(/ondemand\.horizon\-web(\.[a-zGBH0-9\-\.]+)?\.js/g)[0]);
		}
	}

	Deobfuscator.checkIfAllWereReplaced();

	/* We need to have something to unpack. */
	if (!hasUnpackedAnything) {
		console.error("\n  It doesn't seem like we had anything to unpack.");
		console.log("  Please run npm run fetch before trying to decompile.\n");
	}

	console.log("  Resolving dependencies... This may take a moment.\n");

	if (debug) {
		console.log("Reading files of " + unpackedDir);
	}

	let pleaseReadDir = klawSync(unpackedDir, {nodir: true});

	var bar = new ProgressBar("  Resolving dependencies [:bar] :percent", {
	    complete: "=",
	    incomplete: " ",
	    width: 30,
	    total: pleaseReadDir.length
	});

	for (const file of pleaseReadDir) {

		if (debug) {
			console.log("Checking file " + file.path);
		}

		var source = fs.readFileSync(file.path)+"";
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
		});

		if (debug) {
			console.log(file.path)
		}

		let ID = (typeof deobfMap[file.path] !== "undefined") ? deobfMap[file.path] : parseInt((file.path.match(/\d+/g) || 0)[0]);

		if (typeof requirementMap[ID] === "undefined") {

			source = source.replace(/\n\t\[\*\*DECOMPILER_RENDER_DEPENDENCY_MAP\*\*\]/g, "")

		} else {

			let dependedOnBy = "";
			var increment = 0;

			/* Prints out everything that requires this module */

			requirementMap[ID].forEach(requiredThing => {

				if (increment < maximumShownDeps)
					dependedOnBy += "\tRequired by " + (deobfuscatedFunctions[requiredThing] || requiredThing) + "\n";

				increment++;
			})

			/* there's too many of them! */

			if (increment > maximumShownDeps) {
				dependedOnBy += "\t... and " + (increment - maximumShownDeps) + " others";
			}
			source = source.replace(/\t\[\*\*DECOMPILER_RENDER_DEPENDENCY_MAP\*\*\]/g, dependedOnBy)
		}

		/* Why write again if it's the same? */
		if (originalSource !== source) {
			let fileOperation = fs.writeFileSync(file.path, source);

			if (debug) {
				console.log(fileOperation)
			}
		}

		bar.tick(); /* make the progress bar go */
	}

	if (beautifyModules) {

		let readDirsPlease = klawSync(unpackedDir, {nofile: true});

		for (var dir of readDirsPlease) {
			fs.mkdirSync(dir.path.replace(unpackedDir, beautifiedDir), {recursive:true});
		}


		let readDirPlease = klawSync(unpackedDir, {nodir: true});

		var copyBar = new ProgressBar("  Copying unformatted unpacked files [:bar] :percent", {
		    complete: "=",
		    incomplete: " ",
		    width: 30,
		    total: readDirPlease.length
		});

		for (var file of readDirPlease) {
			copyBar.tick();
			fs.copyFileSync(file.path, file.path.replace(unpackedDir, beautifiedDir));
		}

		let readBeautifyDirPlease = klawSync(beautifiedDir, {nodir: true});

		var beautyBar = new ProgressBar("  Beautifying modules... [:bar] :percent", {
		    complete: "=",
		    incomplete: " ",
		    width: 30,
		    total: readBeautifyDirPlease.length
		});

		for (var file of readBeautifyDirPlease) {
			if (debug) {
				console.log("Beautifying " + file.path + "...");
			}

			let readTheDir = fs.readFileSync(file.path) + "";
			let beautifiedThing = beautify(readTheDir);
			if (beautifiedThing !== readTheDir) {
				fs.writeFileSync(file.path, beautifiedThing);
			}

			beautyBar.tick();
		}

		console.log("\n  Running additional formatting...\n");

		let readPrettyDirPlease = klawSync(beautifiedDir, {nodir: true});

		for (var file of readPrettyDirPlease) {
			var source = fs.readFileSync(file.path)+"";

			source = source.replace(/(?<![a-zA-Z0-9])void 0(?![a-zA-Z0-9])/g, "undefined"); // void 0 => undefined
			source = source.replace(/(?<![!A-Za-z0-9])!0(?![A-Za-z0-9])/g, "true"); // !0 => true
			source = source.replace(/(?<![!A-Za-z0-9])!1(?![A-Za-z0-9])/g, "false"); // !1 => false

			fs.writeFileSync(file.path, source);
		}
	}
	finishThingsUp();

}

function finishThingsUp() {
	if (reportHoles) {
		let modulesFoundCount = modulesFound.length;
		let modulesExpected = 0;

		let temp = {}

		/* Try to figure out the largest known module */
		modulesFound.forEach(a => {
			temp[a] = true;
			if (a > modulesExpected)
				modulesExpected = a
		});

		for (let i = 0; i < modulesExpected; i++) {
			if (temp[i] !== true) {
				console.log("  There's a hole where module " + i + " should be.")
			}
		}

		/*
			Even with fetch, there are holes. I'm not sure what they're from.
			If you have any idea, please let maintainer @dangeredwolf know.
		*/
		console.log("  Found " + modulesFoundCount + ", expected " + modulesExpected)
	}


	Deobfuscator.printStatus(); /* Hey deobfuscator, how did things go? Good, I hope! */

	console.log("\n  Waiting for all file operations to complete...\n");
}

console.log("  Starting TweetDeck Decompiler\n");

unpack();

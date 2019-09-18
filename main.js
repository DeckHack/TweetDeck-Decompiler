const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const unpacker = require("webpack-unpack")

let unpackedDir = "unpack";

/**
 * Object.prototype.forEach() polyfill
 * https://gomakethings.com/looping-through-objects-with-es6/
 * @author Chris Ferdinandi
 * @license MIT
 */
if (!Object.prototype.forEach) {
	Object.defineProperty(Object.prototype, 'forEach', {
		value: function (callback, thisArg) {
			if (this == null) {
				throw new TypeError('Not an object');
			}
			for (var key in this) {
				if (this.hasOwnProperty(key)) {
					callback.call(thisArg, this[key], key, this);
				}
			}
		}
	});
}

function saveModule(mod, loc) {
	console.log("Saving " + (loc ? loc + " " : "") + "module " +mod.id);
	let source = mod.source;

	mod.deps.forEach(dep => {
		source = "// Requires m" + dep + ".js\n" + source
	})

	source = source.replace(/(?<=require)\((?=\d{0,4}\))/g,"(\"./m").replace(/(?<=require\(\"(\.\/)m\d{0,4})\)/g,".js\")");

	fs.writeFileSync(unpackedDir + "/m"+mod.id+".js", source);
}

function unpack() {

	try {
		for (const file of fs.readdirSync(unpackedDir)) {
			fs.unlinkSync(path.join(unpackedDir, file));
		}

		fs.rmdirSync(unpackedDir);
	} catch(e) {}
	fs.mkdirSync(unpackedDir);

	let bundle = fs.readFileSync("./bundle.js");
	let unpackedModules = unpacker(bundle);

	let vendor = fs.readFileSync("./vendor.js");
	let unpackedModulesVendor = unpacker(vendor);

	unpackedModules.forEach(mod => saveModule(mod, "bundle"));
	unpackedModulesVendor.forEach(mod => saveModule(mod, "vendor"));

try {
	let mapbox = fs.readFileSync("./mapbox.js");
	let unpackedModulesMapbox = unpacker(mapbox);
	unpackedModulesMapbox.forEach(mod => saveModule(mod, "mapbox"));
} catch (e) { console.log("Skipping mapbox.js... ", e) }
try {
	let vendorsMapbox = fs.readFileSync("./vendors~mapbox.js");
	let unpackedModulesVendorsMapbox = unpacker(vendorsMapbox);
	unpackedModulesVendorsMapbox.forEach(mod => saveModule(mod, "vendors~mapbox"));
} catch (e) { console.log("Skipping vendors~mapbox.js... ", e) }
	console.log("Beautifying modules... this may take a moment");

	exec("js-beautify " + unpackedDir + "/*.js", (err, stdout, stderr) => {
		if (err) {
			throw err;
		}
		process.exit(0);
	})
}

console.log("Starting TweetDeck Disassembler");

fs.closeSync(fs.openSync("./bundle.js"));
fs.closeSync(fs.openSync("./vendor.js"));
unpack();

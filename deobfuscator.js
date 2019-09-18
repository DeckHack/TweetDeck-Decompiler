const fs = require("fs");
const path = require("path");
let deob = JSON.parse(fs.readFileSync("./deobfuscator.json"));
let doneOnes = {};

exports.deobfuscator = (source) => {
	for (i in deob) {
		if (source.match(deob[i]+"") !== null) {
			if (typeof doneOnes[i] !== "undefined") {
				throw "Uh oh, seems we have a duplicate on " + i;
			}
			doneOnes[i] = true;
			return i;
		}
	}
	return null;
}

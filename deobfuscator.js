const fs = require("fs");
const path = require("path");
let deob = JSON.parse(fs.readFileSync("./deobfuscator.json"));

exports.deobfuscator = (source) => {
	for (i in deob) {
		if (source.match(deob[i]) !== null) {
			return i;
		}
	}
	return null;
}

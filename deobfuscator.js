const fs = require("fs");
const path = require("path");
const { deobf_rules } = require("./deobf_rules.js");
const debug = false;

class Deobfuscator {


	static doneOnes = {};

	constructor() {
		return this;
	}

	static checkIfAllWereReplaced() {
		for (var i in deobf_rules) {
			if (typeof Deobfuscator.doneOnes[i] === "undefined") {
				console.log("  Warning: Rule " + i + " did not apply to any modules.")
			}
		}

	}

	static run(source, thisMod) {

		let returnMe = null;

		for (var i in deobf_rules) {
			let thing = deobf_rules[i];

			if (thing.substr(0,2) === "***") {
				if (debug) {
					console.log("Detected RegEx");
					console.log("thing: "+thing);
					console.log("match thing: "+source.match(thing.substr(3)));

				}
				if (source.match(thing.substr(3)) !== null) {
					if (typeof Deobfuscator.doneOnes[i] !== "undefined") {
						throw "Uh oh, seems we have a duplicate on " + i + " (last seen in " + Deobfuscator.doneOnes[i] + ")";
					}
					Deobfuscator.doneOnes[i] = thisMod;
					returnMe = i;
				}
			} else {
				if (debug) {
					console.log("thing: "+thing);
					console.log("includes thing: "+source.includes(thing));

				}
				if (source.includes(thing)) {
					if (typeof Deobfuscator.doneOnes[i] !== "undefined") {
						throw "Uh oh, seems we have a duplicate on " + i + " (last seen in " + Deobfuscator.doneOnes[i] + ")";
					}
					Deobfuscator.doneOnes[i] = thisMod;
					returnMe = i;
				}
			}


		}

		return returnMe;
	}

}

exports.Deobfuscator = Deobfuscator;

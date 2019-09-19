const fs = require("fs");
const path = require("path");
const { deobf_rules } = require("./deobf_rules.js");

/* Throws a bunch of console.logs to help diagnose deep issues */
const debug = false;

/*
	true: If a deobfuscation rule applies to more than 1 file, an exception is thrown, halting operations
	false: If a deobfuscation rule applies to more than 1 file, warnings are shown, but modules are still processed so that it's easier to diagnose.
*/
let duplicatesAreErrors = false;

class Deobfuscator {

	/*
		Object that keeps track of which deobf rules were used, and where they were used.
		This lets the deobfuscator flag down any duplicate rules.
	*/
	static doneOnes = {};
	static deobfCount = 0;
	static totalCount = 0;
	static regexRules = {};

	constructor() {
		return this;
	}

	/*
		If any rules go unused, we'll let you know.

		This is useful,
		1. To diagnose malformed rules (it happens!)
		2. We'll know if TweetDeck removes any modules/features
	*/

	static checkIfAllWereReplaced() {
		for (var i in deobf_rules) {
			if (typeof Deobfuscator.doneOnes[i] === "undefined") {
				console.log("  Warning: " + (Deobfuscator.regexRules[i] ? "Regex " : "") + "Rule " + i + " did not apply to any modules.")
			}
		}
	}

	static printDeobfCount() {
		console.log("\n  " + Deobfuscator.deobfCount + " modules were deobfuscated out of " + Deobfuscator.totalCount + " modules.")
	}

	static run(source, thisMod) {

		let returnMe = null;

		Deobfuscator.totalCount++;

		for (var i in deobf_rules) {
			let thing = deobf_rules[i];

			if (thing.substr(0,3) === "***") {
				Deobfuscator.regexRules[i] = true;
				if (debug) {
					console.log("Detected RegEx");
					console.log("thing: "+thing);
					console.log("match thing: "+source.match(thing.substr(3)));

				}
				if (source.match(thing.substr(3)) !== null) {
					if (typeof Deobfuscator.doneOnes[i] !== "undefined") {
						if (!duplicatesAreErrors) {
							console.log("\n  Warning: Rule " + i + " was duplicated in " + Deobfuscator.doneOnes[i] + ", found processing " + thisMod + ".");
							console.log("  duplicatesAreErrors is set to false, so processing will continue. Duplicates will not be deobfuscated.");
							return;
						}
						throw "Uh oh, seems we have a duplicate on " + i + " (last seen in " + Deobfuscator.doneOnes[i] + ", found processing " + thisMod + ")";
					}
					Deobfuscator.doneOnes[i] = thisMod;
					returnMe = i;
					Deobfuscator.deobfCount++;
				}
			} else {
				if (debug) {
					console.log("thing: "+thing);
					console.log("includes thing: "+source.includes(thing));

				}
				if (source.includes(thing)) {
					if (typeof Deobfuscator.doneOnes[i] !== "undefined") {
						if (!duplicatesAreErrors) {
							console.log("\n  Warning: Rule " + i + " was duplicated in " + Deobfuscator.doneOnes[i] + ", found processing " + thisMod + ".");
							console.log("  duplicatesAreErrors is set to false, so processing will continue. Duplicates will not be deobfuscated.");
							return;
						}
						throw "Uh oh, seems we have a duplicate on " + i + " (last seen in " + Deobfuscator.doneOnes[i] + ", found processing " + thisMod + ")";
					}
					Deobfuscator.doneOnes[i] = thisMod;
					returnMe = i;
					Deobfuscator.deobfCount++;
				}
			}


		}

		return returnMe;
	}

}

exports.Deobfuscator = Deobfuscator;

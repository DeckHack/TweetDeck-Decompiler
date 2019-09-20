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
				console.log("  Warning: Rule " + i + " did not apply to any modules.")
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
			let rule = deobf_rules[i];
			let matches = false;

			if (typeof rule === "string") {
				matches = source.includes(rule);
			} else if (rule instanceof RegExp) {
				if (rule.global) {
					throw "Uh oh, RegExp rule must not be global: " + rule; // global modifies RegExp lastIndex after each match
				}

				matches = rule.test(source);
			} else if (typeof rule === "function") {
				matches = rule(source, thisMod);
			} else {
				throw "Uh oh, could not determine rule type, expected string/RegExp/function, got: " + rule;
			}

			if (debug) {
				console.log("Rule: " + rule);
				console.log("Matches: " + matches);
			}

			if (matches) {
				if (typeof Deobfuscator.doneOnes[i] !== "undefined") {
					if (!duplicatesAreErrors) {
						console.log("\n  Warning: Rule " + i + " was duplicated in " + Deobfuscator.doneOnes[i] + ", found processing " + thisMod + ".");
						console.log("  duplicatesAreErrors is set to false, so processing will continue. Duplicates will not be deobfuscated.");
						return null;
					}
					throw "Uh oh, seems we have a duplicate on " + i + " (last seen in " + Deobfuscator.doneOnes[i] + ", found processing " + thisMod + ")";
				}
				Deobfuscator.doneOnes[i] = thisMod;
				returnMe = i;
				Deobfuscator.deobfCount++;
			}
		}

		return returnMe;
	}

}

exports.Deobfuscator = Deobfuscator;

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
	static duplicateAware = {};
	
	static deobfCount = 0;
	static totalCount = 0;
	
	static warnings = [];

	constructor() {
		return this;
	}
	
	static initializeRules() {
		for (var i in deobf_rules) {
			let rule = deobf_rules[i];
			
			if (typeof rule !== "object") {
				continue;
			}
			
			if ("duplicates" in rule) {
				if (!("rule" in rule)){
					throw "Uh oh, duplicate-aware rule is missing the rule part of the rule: " + rule;
				}
				
				Deobfuscator.duplicateAware[i] = {
					total: rule.duplicates,
					found: []
				};
				
				deobf_rules[i] = rule.rule;
			}
		}
	}

	/*
		If any rules go unused, we'll let you know.

		This is useful,
		1. To diagnose malformed rules (it happens!)
		2. We'll know if TweetDeck removes any modules/features
	*/

	static checkIfAllWereReplaced() {
		for (var i in deobf_rules) {
			if (typeof Deobfuscator.duplicateAware[i] !== "undefined") {
				var entry = Deobfuscator.duplicateAware[i];
				var count = entry.found.length;
				
				if (count !== entry.total) {
					Deobfuscator.warnings.push("Duplicate-aware rule " + i + " applied an incorrect amount of times, expected " + entry.total + ", got " + count + ": [ " + entry.found.join(", ") + " ]");
				}
			} else if (typeof Deobfuscator.doneOnes[i] === "undefined") {
				Deobfuscator.warnings.push("Rule " + i + " did not apply to any modules.");
			}
		}
	}

	static printStatus() {
		if (Deobfuscator.warnings.length === 0) {
			console.log("\n  Deobfuscation finished with no warnings!");
		} else {
			console.log("\n  Deobfuscation finished with " + Deobfuscator.warnings.length + " warning(s):");
			
			for (var warn of Deobfuscator.warnings.sort()) {
				console.log("  > " + warn);
			}
		}
		
		console.log("\n  " + Deobfuscator.deobfCount + " modules were deobfuscated out of " + Deobfuscator.totalCount + " modules.");
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
				if (typeof Deobfuscator.duplicateAware[i] !== "undefined") {
					var found = Deobfuscator.duplicateAware[i].found;
					found.push(thisMod);
					
					if (i.includes(".js")) {
						returnMe = i.replace(".js", "." + found.length + ".js");
					} else {
						throw "Uh oh, rule " + i + " is missing the .js extension";
					}
				} else if (typeof Deobfuscator.doneOnes[i] !== "undefined") {
					if (!duplicatesAreErrors) {
						Deobfuscator.warnings.push("Rule " + i + " was duplicated in " + Deobfuscator.doneOnes[i] + ", found processing " + thisMod + ".");
						return null;
					}
					throw "Uh oh, seems we have a duplicate on " + i + " (last seen in " + Deobfuscator.doneOnes[i] + ", found processing " + thisMod + ")";
				} else {
					Deobfuscator.doneOnes[i] = thisMod;
					returnMe = i;
				}
				
				Deobfuscator.deobfCount++;
			}
		}

		return returnMe;
	}

}

Deobfuscator.initializeRules();
exports.Deobfuscator = Deobfuscator;

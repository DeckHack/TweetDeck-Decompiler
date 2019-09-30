# TweetDeck Decompiler

## A easy-to-use Node.js tool to decompile TweetDeck's webpacked code.


**What does it do?**

It unpacks, cleans up, and saves each module in TweetDeck as its own file.

Each file is exported to the `unpacked` folder, which is automatically created when you run TweetDeck Decompiler.

The magic sauce is not the unpacking, though. The magic sauce is the deobfuscator, which gives each module a human readable name, rather than just a number. Over 1000 modules as of writing are automatically deobfuscated, a number which continues to grow as more work is done. This is non-trivial because there are no actual names of modules within the code, nor do we have ahold of any debug symbols which could help us out.

Non-deobfuscated modules are still exported, but they're exported using a generic, sequential name corresponding to its module ID.

TweetDeck is comprised of over 2400 individual modules, and these modules are rolled into a couple webpacks.

### Installation Requirements
- [Node.js](https://nodejs.org/en/) and NPM. You need the latest version, not LTS, because older versions don't yet support static functions within classes.


1. Open your Terminal (PowerShell/cmd.exe on Windows)
2. `cd` into the project directory
3. Run `npm install`
4. Run `npm run fetch`
*This fetches TweetDeck's latest JS files automatically from the internet*
4. Run `npm start`
5. That's it!

### Troubleshooting

**`Syntax error` somewhere** Be sure you are using the latest version of Node/NPM. See Installation Requirements for details.

Please contact [dangeredwolf](https://github.com/dangeredwolf) with other problems.

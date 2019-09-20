# TweetDeck Decompiler

## A easy-to-use Node.js tool to decompile TweetDeck's code.


**What does it do?**

It unpacks, cleans up, and saves each module in TweetDeck as its own file.

Each file is exported to the `unpacked` folder, which is automatically created when you run TweetDeck Decompiler.


### Installation Requirements
- [Node.js](https://nodejs.org/en/) and NPM
- TweetDeck's JavaScript files (`bundle.xx.js`, `vendor.xx.js`, `mapbox.xx.js`, etc)


1. Open your Terminal (PowerShell/CMD on Windows)
2. CD into the project directory
3. Run `npm install`
4. Run `npm run fetch`
*This fetches TweetDeck's latest JS files automatically from the internet*
4. Run `npm start`
5. That's it!

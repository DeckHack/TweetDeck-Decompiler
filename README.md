# TweetDeck Decompiler

## A easy-to-use Node.js tool to decompile TweetDeck's code.


**What does it do?**

It unpacks, cleans up, and saves each module in TweetDeck as its own file. 

Each file is exported to the `unpacked` folder, which is automatically created when you run TweetDeck Decompiler.


### Installation Requirements
- [Node.js](https://nodejs.org/en/) and NPM
- TweetDeck's JavaScript files (`bundle.xx.js`, `vendor.xx.js`, `mapbox.xx.js`, etc)


1. Put TweetDeck's JavaScript files (described above) into the project directory (TweetDeck-Decompiler)
   - *It is not necessary to rename the files. TweetDeck Decompiler handles it either way.*
2. Open your Terminal (PowerShell/CMD on Windows)
3. CD into the project directory
4. Run `npm install`
5. Run `npm start`
6. That's it!

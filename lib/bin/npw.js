#!/usr/bin/env node
'use strict';

require('colors');
const caniuseYarn = require('@danielbayerlein/caniuse-yarn');
const chalk = require('chalk');
const hasYarn = require('has-yarn');

const MODE = require('./mode');
const spawner = require('./spawner');
const notifier = require('./notifier');

const packageInfo = require('./package.json');

const { homepage } = packageInfo;

// notifier(); // Update notifier.
process.argv
let green = chalk.green;
let cyan = chalk.cyan;
let commandText = green('npw');

const argv = require('yargs')
  .usage(`Usage: ${commandText} [options] ${cyan('<package> ...')}`)
  .help()
  // .alias('help', 'h')
  // .version()
  // .alias('version', 'V')
  .example(`${commandText}`, 'Wraps `npm 5` with extra commands and corrects line-endings in `package*.json` to match .git config.')

  // Global
  .boolean('blast')
  .group('blast', 'Blast Options:')
  // .alias('global', 'g')
  .describe('blast', 'rimrafs node_modules and package-lock.json')
  .example(`${commandText} --blast ${cyan('npm i')}`, `rimrafs node_modules and package-lock.json, then runs ${cyan('npm install')}`)

  .boolean('brief')
  .group('brief', 'Brief Options:')
  .describe('brief', 'Hide npm command output and instead show a spinner')

  // .boolean('verbose')
  // .alias('verbose', 'v')
  // .describe('verbose', 'Display more information')
  .epilog(`⭐ Star me at ${homepage} 😃`)
  .argv;

let blast = argv.blast;
let verbose = !argv.brief;

let npmSpawner = spawner.npmSpawner;
let spawnCaller = npmSpawner;

let blastPromise = Promise.resolve();
if (blast) {
  blastPromise = spawnCaller.blast('all', false);
}

if (argv._.length > 0) {
  blastPromise.then(() =>
    spawnCaller(argv._, verbose));
}

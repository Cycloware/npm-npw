'use strict';

require('colors');
const chalk = require('chalk');

const MODE = require('./mode');
const spawner = require('./spawner');
const notifier = require('./notifier');

const packageInfo = require('../package.json');

const { homepage } = packageInfo;

function executor(commandTextIn, argsIn, argsAsIs) {
  if (!argsIn) {
    argsIn = process.argv.slice(2);
  } else {
    if (!argsAsIs) {
      argsIn = argsIn.concat(process.argv.slice(2))
    }
  }

  console.log(`argsIn: ${chalk.yellow(argsIn)}`);
  // notifier(); // Update notifier.
  let green = chalk.green;
  let cyan = chalk.cyan;
  let commandText = green(commandTextIn);

  const argv = require('yargs')(argsIn)
    .usage(`Usage: ${commandText} [options] ${cyan('<npm commands & options> ...')}`)
    .help()
    // .alias('help', 'h')
    // .version()
    // .alias('version', 'V')
    .example(`${commandText}`, `Wraps '${'npm'.cyan}' with extra commands and corrects line-endings in '${'package*.json'.yellow}' to match ${'.git config'.yellow}.`)

    // Global
    .boolean('blast')
    .group('blast', 'Blast Options:')
    // .alias('global', 'g')
    .describe('blast', 'rimrafs node_modules and package-lock.json')
    .example(`${commandText} --blast ${cyan('install')}`, `'${'rimrafs'.cyan}' ${'node_modules'.gray} & ${'package-lock.json'.gray}, then runs ${cyan('npm install')}`)

    .boolean('brief')
    .group('brief', 'Brief Options:')
    .describe('brief', 'Hide npm command output and instead show a spinner')

    .option('lines', {
      choices: ['crlf', 'lf', 'cr', 'none'],
      default: 'crlf'
    })
    .boolean('noLines')
    .alias('noLines', 'noLine')
    .group(['lines', 'noLines'], 'Line Options:')
    // .boolean('verbose')
    // .alias('verbose', 'v')
    // .describe('verbose', 'Display more information')
    .epilog(`⭐ Star me at ${homepage} 😃`)
    .argv;

  let blast = argv.blast;
  let verbose = !argv.brief;

  let lines = argv.lines;
  let noLines = argv.noLines;

  if (noLines) {
    lines = 'none';
  }

  let npmSpawner = spawner.npmSpawner;
  let spawnCaller = npmSpawner;

  const startingPromise = Promise.resolve()
  let blastPromise = startingPromise;
  if (blast) {
    blastPromise = spawnCaller.blast('all', false);
  }

  let npmPromise = blastPromise;
  if (argv._.length > 0) {
    npmPromise = npmPromise.then(() =>
      spawnCaller(argv._, verbose));
  }

  let linesPromise = npmPromise;
  if (lines !== 'none') {
    linesPromise = linesPromise.then(() => {
      spawnCaller.lines(lines, verbose);
    })
  }

  if (linesPromise === startingPromise) {
    console.warn(`${'Nothing was executed!'.yellow}`);
  }
}

module.exports = executor;

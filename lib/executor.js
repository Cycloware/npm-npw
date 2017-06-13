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

  // console.log(`argsIn: ${chalk.yellow(argsIn)}`);
  notifier(); // Update notifier.
  // let green = chalk.green;
  // let cyan = chalk.cyan;
  // let commandText = green(commandTextIn);

  // const argv3 = require('yargs')(argsIn)
  //   .usage(`Usage: ${commandText} [options] ${cyan('<npm commands & options> ...')}`)
  //   .help()
  //   // .alias('help', 'h')
  //   // .version()
  //   // .alias('version', 'V')
  //   .example(`${commandText}`, `Wraps '${'npm'.cyan}' with extra commands and corrects line-endings in '${'package*.json'.yellow}' to match ${'.git config'.yellow}.`)

  //   // Global
  //   // .boolean('blast')
  //   // .group('blast', 'Blast Options:')
  //   // // .alias('global', 'g')
  //   // .describe('blast', 'rimrafs node_modules and package-lock.json')
  //   // .example(`${commandText} --blast ${cyan('install')}`, `'${'rimrafs'.cyan}' ${'node_modules'.gray} & ${'package-lock.json'.gray}, then runs ${cyan('npm install')}`)

  //   // .boolean('brief')
  //   // .group('brief', 'Brief Options:')
  //   // .describe('brief', 'Hide npm command output and instead show a spinner')

  //   .option('lines', {
  //     choices: ['crlf', 'lf', 'cr', 'none', false],
  //     default: 'crlf'
  //   })
  //   .alias('lines', 'line')
  //   .boolean('no-lines')
  //   .alias('no-lines', 'no-line')
  //   .group(['lines', 'no-lines'], 'Line Options:')
  //   // .boolean('verbose')
  //   // .alias('verbose', 'v')
  //   // .describe('verbose', 'Display more information')
  //   .epilog(`${homepage}`)
  //   .strict()
  // // .showHelpOnFail(false)
  // // .argv;

  let blast = false;
  let verbose = true;
  let brief = false;
  let noLines = false;
  let lines = 'crlf';

  const takeItemsBrief = ['--breif'];
  const takeItemsBlast = ['--blast', '--blast-all', 'blast'];
  const takeItemsBlastNode = ['--blast-node', '--blast-node_modules', '--blast-node-modules', 'blast-node', 'blast-node_modules', 'blast-node-modules'];
  const takeItemsBlastLock = ['--blast-lock', 'blast-lock'];
  const takeItemsNoLine = ['--no-lines', '--no-line'];
  const takeItemsLinesCRLF = ['--line-crlf', '--lines-crlf'];
  const takeItemsLinesLF = ['--line-lf', '--lines-lf'];
  const takeItemsLinesCR = ['--line-cr', '--lines-cr'];

  const actionArrayMap = takeItemsBrief.map(p => {
    return {
      key: p,
      action: () => { brief = true; verbose = false; },
    }
  }).concat(takeItemsBlast.map(p => {
    return {
      key: p,
      action: () => blast = 'all',
    }
  })).concat(takeItemsBlastNode.map(p => {
    return {
      key: p,
      action: () => blast = 'node',
    }
  })).concat(takeItemsBlastLock.map(p => {
    return {
      key: p,
      action: () => blast = 'lock',
    }
  })).concat(takeItemsNoLine.map(p => {
    return {
      key: p,
      action: () => noLine = true,
    }
  })).concat(takeItemsLinesCRLF.map(p => {
    return {
      key: p,
      action: () => lineEnding = 'crlf',
    }
  })).concat(takeItemsLinesLF.map(p => {
    return {
      key: p,
      action: () => lineEnding = 'lf',
    }
  })).concat(takeItemsLinesLF.map(p => {
    return {
      key: p,
      action: () => lineEnding = 'cr',
    }
  }))

  const lookupActionMap = {};
  for (const dex in actionArrayMap) {
    const actX = actionArrayMap[dex];
    lookupActionMap[actX.key.toLowerCase()] = actX.action;
  }

  const argsLeft = [];
  for (const dex in argsIn) {
    const val = argsIn[dex];
    const valLower = val.toLowerCase();
    const action = lookupActionMap[valLower];
    if (action) {
      action();
    } else {
      argsLeft.push(val);
    }
  }

  // const argvParsed = argv3.parse;

  if (noLines || lines === false) {
    lines = 'none';
  }

  // console.log(`argv: ${chalk.yellow(JSON.stringify(argv, null, 1))}`);

  let npmSpawner = spawner.npmSpawner;
  let spawnCaller = npmSpawner;

  const startingPromise = Promise.resolve()
  let blastPromise = startingPromise;
  if (blast) {
    blastPromise = spawnCaller.blast(blast, false);
  }

  let npmPromise = blastPromise;
  if (argsLeft.length > 0) {
    npmPromise = npmPromise.then(() =>
      spawnCaller(argsLeft, verbose));
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

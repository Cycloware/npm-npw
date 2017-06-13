'use strict';

require('colors');
const chalk = require('chalk');

const MODE = require('./mode');
const spawner = require('./spawner');
const notifier = require('./notifier');

const packageInfo = require('../package.json');
const fs = require('fs-extra-promise');

const { homepage } = packageInfo;

const funcArrayPush = Array.prototype.push;

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


  const commandObjects = [];
  const actionArrayMap = [];
  const lookupActionMap = {};
  const defaultCommandOptions = { nArgs: 0, justPeek: false };
  function buildCommandOptions(switches, action, options) {
    let { nArgs, justPeek } = options || defaultCommandOptions;
    if (!nArgs || nArgs < 0) {
      nArgs = defaultCommandOptions.nArgs;
    }
    if (justPeek === undefined) {
      justPeek = defaultCommandOptions.justPeek;
    }

    const switchMap = {};
    const commandObject = {
      switches,
      switchMap,
      action,
      nArgs,
      justPeek
    };

    commandObjects.push(commandObject);

    const commandSwitches = switches.map(p => {
      return {
        key: p.toLowerCase(),
        keyActual: p,
        nArgs,
        justPeek,
        action,
        commandObject,
      }
    });

    funcArrayPush.apply(actionArrayMap, commandSwitches);

    for (const dex in commandSwitches) {
      const actionItem = commandSwitches[dex];
      const actionKey = actionItem.key;
      lookupActionMap[actionKey] = actionItem;
      switchMap[actionKey] = actionItem;
    }

    return commandObject;
  }

  let blast = false;
  let verbose = true;
  let brief = false;
  let noLines = false;
  let lines = 'default';
  let global = false;

  let dualPhaseMode = false;
  let unlinkMode = false;

  buildCommandOptions(['--global', '-g'],
    () => {
      global = true;
      if (lines === 'default') {
        lines = 'none';
      }
    }, {
      justPeek: true,
    });
  buildCommandOptions(['--dev', '-dev'],
    (nArgs, argsToPass) => {
      argsToPass.push('--save-dev')
    });
  buildCommandOptions(['--unlink'],
    (nArgs, argsToPass) => {
      argsToPass.push('uninstall', '-g');
      unlinkMode = true;
    });
  buildCommandOptions(['--relink'],
    (nArgs, argsToPass) => {
      dualPhaseMode = 'relink'
    });
  buildCommandOptions(['--uninstall-install', '--un-in', '--unin', 'uninstall-install', 'un-in', 'unin'],
    (nArgs, argsToPass) => {
      dualPhaseMode = 'uninstall-install'
    });
  buildCommandOptions(['--blast', '--blast-all', 'blast'],
    () => blast = 'all');
  buildCommandOptions(['--blast-node', '--blast-node_modules', '--blast-node-modules', 'blast-node', 'blast-node_modules', 'blast-node-modules'],
    () => blast = 'node');
  buildCommandOptions(['--blast-lock', 'blast-lock'],
    () => blast = 'lock');
  buildCommandOptions(['--no-lines', '--no-line'],
    () => noLines = true);

  buildCommandOptions(['--line-crlf', '--lines-crlf'],
    () => lineEnding = 'crlf');
  buildCommandOptions(['--line-lf', '--lines-lf'],
    () => lineEnding = 'lf');
  buildCommandOptions(['--line-cr', '--lines-cr'],
    () => lineEnding = 'cr');

  if (lines === 'default') {
    // read from .get config, etc.
    lines = 'crlf';
  }

  const nullActionItem = { nArgs: 0, justPeek: true };
  const argsToPass = [];
  const argsToPassAdditional = [];
  for (let dex = 0; dex < argsIn.length; dex++) {
    const val = argsIn[dex];
    const valLower = val.toLowerCase();
    const { action, nArgs, justPeek } = lookupActionMap[valLower] || nullActionItem;

    const argsTaken = argsIn.slice(dex + 1, nArgs);
    dex += nArgs;

    if (action) {
      action(argsTaken, argsToPassAdditional);
    }

    if (justPeek) {
      argsToPass.push(val);
      if (nArgs > 0) {
        funcArrayPush.apply(argsToPass, argsTaken);
      }
    }
  }

  // const argvParsed = argv3.parse;

  if (noLines || lines === false) {
    lines = 'none';
  }

  if (global) {
    console.log(`In ${'global mode'.yellow}...`);
  }

  // console.log(`argv: ${chalk.yellow(JSON.stringify(argv, null, 1))}`);

  let npmSpawner = spawner.npmSpawner;
  let spawnCaller = npmSpawner;

  const startingPromise = Promise.resolve()
  let blastPromise = startingPromise;
  if (blast) {
    blastPromise = spawnCaller.blast(blast, false);
  }

  let argsPass1 = [].concat(argsToPassAdditional).concat(argsToPass);
  let argsPass2 = [].concat(argsPass1);

  let npmPromise = blastPromise;

  let dualCommandName = undefined;
  if (dualPhaseMode === 'relink') {
    dualCommandName = 'relink';
  } else if (unlinkMode) {
    dualCommandName = 'unlink';
  }

  // check real args left
  if (argsToPass.length === 0) {
    if (dualCommandName) {
      let autoDeterminedPackageName = undefined;
      try {
        const config = fs.readJsonSync('./package.json');
        if (config) {
          if (typeof config.name === 'string') {
            autoDeterminedPackageName = config.name;
          }
        }
        if (autoDeterminedPackageName) {
          argsPass1 = argsPass1.concat([autoDeterminedPackageName]);
          console.log(`Using auto-determined package name '${autoDeterminedPackageName.yellow}' for ${dualPhaseMode.cyan} command.  From directory '${process.cwd().gray}'`)
        } else {
          console.error(`${dualPhaseMode.cyan} mode requires at least a package name and one could not be determined in '${process.cwd().gray}'.  Check to see if a ${'package.json'.gray} file exists there or specify a package name'.`);
          return -2;
        }
      }
      catch (err) {
        console.error(`${dualPhaseMode.cyan} mode requires at least a package name and one could not be determined in '${process.cwd().gray}'.  Check to see if a ${'package.json'.gray} file exists there or specify a package name'.  Error: ${chalk.red(err)}`);
        return -2;
      }
    }
  }

  if (argsPass1.length > 0) {
    if (dualPhaseMode) {
      // argsPassed = argsPassed.filter(p => ['uninstall', 'un', 'unlink', 'remove', 'rm', 'r', 'install', 'i', 'isntall', 'add'].indexOf(p) < 0)
      if (dualPhaseMode == 'uninstall-install') {
        npmPromise = npmPromise.then(() =>
          spawnCaller(['uninstall'].concat(argsPass1), verbose))
          .then(() =>
            spawnCaller(['install'].concat(argsPass2), verbose)
          );
      } else if (dualPhaseMode == 'relink') {
        npmPromise = npmPromise.then(() =>
          spawnCaller(['uninstall', '-g'].concat(argsPass1), verbose))
          .then(() =>
            spawnCaller(['link'].concat(argsPass2), verbose)
          );
      } else {
        console.error(`Unknown dual-phase-mode '${dualPhaseMode.red}'`);
        return -1;
      }
    } else {
      npmPromise = npmPromise.then(() =>
        spawnCaller(argsPass1, verbose));
    }
  }

  if (argsPass1.length < 1) {
    if (dualPhaseMode) {
      console.error(`${dualPhaseMode.cyan} mode requires at least a package name`);
      return -1;
    }
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

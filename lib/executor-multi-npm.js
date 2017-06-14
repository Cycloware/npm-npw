'use strict';

require('colors');
const chalk = require('chalk');

const spawner = require('./spawner');
const notifier = require('./notifier');

const packageInfo = require('../package.json');
const fs = require('fs-extra-promise');
const path = require('path');

const unquote = require('unquote');

const isRoot = require('is-root');

const { homepage } = packageInfo;

const executingAsRoot = isRoot();

if (executingAsRoot) {
  console.log(`Running as:  ${executingAsRoot ? 'SUDO'.red : 'normal user'.green}`)
}

const funcArrayPush = Array.prototype.push;

Array.prototype.pushArray = function pushArray(array) {
  return funcArrayPush.apply(this, array);
}

function executor(commandTextIn, argsIn, argsAsIs, argsToNpm) {
  if (!argsIn) {
    argsIn = process.argv.slice(2);
  } else {
    if (!argsAsIs) {
      argsIn = argsIn.concat(process.argv.slice(2))
    }
  }

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

    actionArrayMap.pushArray(commandSwitches);

    for (const dex in commandSwitches) {
      const actionItem = commandSwitches[dex];
      const actionKey = actionItem.key;
      lookupActionMap[actionKey] = actionItem;
      switchMap[actionKey] = actionItem;
    }

    return commandObject;
  }

  let verbose = true;
  let global = true;

  let changeDirTo = undefined;
  const startingDirectory = process.cwd();

  buildCommandOptions(['--cd', '-cd', 'cd'],
    (nArgs) => {
      changeDirTo = nArgs;
    }, {
      nArgs: 1,
    });

  const nullActionItem = { nArgs: 0, justPeek: true };
  const argsToPassLead = [];
  const argsToPass = [];
  const argsToPassAdditional = [];
  for (let dex = 0; dex < argsIn.length; dex++) {
    const val = argsIn[dex];
    const valLower = val.toLowerCase();
    const { action, nArgs, justPeek } = lookupActionMap[valLower] || nullActionItem;

    let takeAt = dex + 1;
    const argsTaken = argsIn.slice(takeAt, takeAt + nArgs);
    dex += nArgs;

    if (action) {
      action(argsTaken, argsToPassLead, argsToPassAdditional);
    }

    if (justPeek) {
      argsToPass.push(val);
      if (nArgs > 0) {
        argsToPass.pushArray(argsTaken);
      }
    }
  }

  // const argvParsed = argv3.parse;

  let changeWorkingDirBackTo = undefined;

  try {
    if (changeDirTo) {
      if (changeDirTo.length < 1) {
        console.error(`${'Error:'.red}  option '${'--cd'.red}' must be followed by a relative or absolute path.`);
        return -1;
      } else {
        const rawDir = changeDirTo[0];
        const inputDir = unquote(rawDir);
        const inputRelative = !path.isAbsolute(inputDir);
        const absolutePath = path.resolve(startingDirectory, inputDir);

        try {

          if (fs.existsSync(absolutePath)) {
            console.log(`Changing working directory to '${inputDir.yellow}'`);
            process.chdir(absolutePath);

            // no need to change back
            // changeWorkingDirBackTo = (from) => {
            //   // process.chdir(currentDirectory);
            //   if (loud) {
            //     console.log(`Changing working directory back to '${currentDirectory.yellow}${true ? ` from: ${chalk.red(from)}` : ''}'`);
            //   }
            //   // changeWorkingDirBackTo = undefined;
            // }
          } else {
            console.error(`${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${inputRelative ? `, absolutePath '${absolutePath.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}`)
            return -1;
          }
        } catch (err) {
          console.error(`${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${inputRelative ? `, absolutePath '${absolutePath.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}; Error: ${chalk.red(err)}`)
          return -1;
        }
      }
    }

    // if (lines === 'default') {
    //   // read from .get config, etc.
    //   lines = 'crlf';
    // }

    // if (noLines || lines === false) {
    //   lines = 'none';
    // }

    if (global) {
      console.log(`In ${'global mode'.yellow}...`);
    }

    // console.log(`argv: ${chalk.yellow(JSON.stringify(argv, null, 1))}`);

    let npmSpawner = spawner.npmSpawner;
    let spawnCaller = npmSpawner;

    const startingPromise = Promise.resolve()

    let npmPromise = startingPromise;
    if (argsToPass.length > 0) {
      let argsPass1 = [].concat(argsToPassLead).concat(argsToPass).concat(argsToPassAdditional);

      let allArgs = argsToPass.map(p => [].concat(argsToNpm).concat(argsToPassLead).concat([p]).concat(argsToPassAdditional))

      for (const argX of allArgs) {
        npmPromise = npmPromise.then(() =>
          spawnCaller(argX, verbose));
      }
    }

    if (argsToPass.length < 1) {
      console.error(`${commandTextIn.cyan} mode requires at least a package name`);
      return -1;
    }

    let linesPromise = npmPromise;
    // if (lines !== 'none') {
    //   linesPromise = linesPromise.then(() => {
    //     spawnCaller.lines(lines, verbose);
    //   })
    // }

    return linesPromise.then(() => {
      if (changeWorkingDirBackTo) {
        changeWorkingDirBackTo('lastPromise.then');
      }
    }).catch(err => {
      if (changeWorkingDirBackTo) {
        changeWorkingDirBackTo(`lastPromise.catch; err: ${chalk.red(err)}`);
      }
      throw err;
    })
  } catch (err) {
    console.error(`${'Unhandled exception:'.red}  ${chalk.gray.bgBlack(err)}`);
    return -1;
  }
  finally {
    if (changeWorkingDirBackTo) {
      changeWorkingDirBackTo('finally');
    }
  }

}

module.exports = executor;

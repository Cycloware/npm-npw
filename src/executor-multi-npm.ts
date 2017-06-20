import 'colors';
import * as Promise from 'bluebird';

import chalk = require('chalk');

import { DBlastMode, spawnerNpm, spawnerLines, spawnerBlast } from './npm/spawner';

import fs = require('fs-extra-promise');
import path = require('path');

import { unquote } from './unquote';

import isRoot = require('is-root');

import { CommandBuilder } from './commandBuilder';

const executingAsRoot = isRoot();

if (executingAsRoot) {
  console.log(`Running as:  ${executingAsRoot ? 'SUDO'.red : 'normal user'.green}`)
}


export function executor(exec: { commandText: string, argsIn?: string[], argsAsIs?: string[], argsToNpm?: string[] }) : Promise<void| number> {

  let { commandText, argsIn = [], argsAsIs = [], argsToNpm = [] } = exec;
  if (argsIn.length === 0) {
    argsIn = process.argv.slice(2);
  } else {
    if (argsAsIs.length === 0) {
      argsIn = argsIn.concat(process.argv.slice(2))
    }
  }

  const commands = new CommandBuilder();

  let verbose = true;
  let global = true;

  let changeDirTo: string[] = undefined;
  const startingDirectory = process.cwd();

  commands.addCommandOption(['--cd', '-cd', 'cd'],
    (nArgs) => {
      changeDirTo = nArgs;
    }, {
      nArgs: 1,
    });

  const commandsResult = commands.processCommands(argsIn);
  const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;

  // const argvParsed = argv3.parse;

  let changeWorkingDirBackTo: (from: string) => void = undefined;

  try {
    if (changeDirTo) {
      if (changeDirTo.length < 1) {
        console.error(`${'Error:'.red}  option '${'--cd'.red}' must be followed by a relative or absolute path.`);
        return Promise.resolve(-1);
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
            return Promise.resolve(-1);
          }
        } catch (err) {
          console.error(`${'Cannot change directory to:'.red}  '${inputDir.black.bgWhite}', please ensure it exists${inputRelative ? `, absolutePath '${absolutePath.black.bgWhite}', currentDirectory: ${startingDirectory.black.bgWhite}'` : ''}; Error: ${chalk.red(err)}`)
          return Promise.resolve(-1);
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

    let spawnCaller = spawnerNpm;

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
      console.error(`${commandText.cyan} mode requires at least a package name`);
      return Promise.resolve(-1);
    }

    let linesPromise = npmPromise;
    // if (lines !== 'none') {
    //   linesPromise = linesPromise.then(() => {
    //     spawnCaller.lines(lines, verbose);
    //   })
    // }


    return linesPromise.tap(val => {
      if (changeWorkingDirBackTo) {
        changeWorkingDirBackTo('lastPromise.tap');
      }
    }).tapCatch(err => {
      if (changeWorkingDirBackTo) {
        changeWorkingDirBackTo(`lastPromise.catch; err: ${chalk.red(err)}`);
      }
      throw err;
    })
  } catch (err) {
    console.error(`${'Unhandled exception:'.red}  ${chalk.gray.bgBlack(err)}`);
    return Promise.resolve(-1);
  }
  finally {
    if (changeWorkingDirBackTo) {
      changeWorkingDirBackTo('finally');
    }
  }

}


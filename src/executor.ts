import 'colors';
import * as Promise from 'bluebird';

import chalk = require('chalk');

import { DBlastMode, spawnerNpm, spawnerLines, spawnerBlast } from './npm/spawner';

import fs = require('fs-extra-promise');
import path = require('path');

import { unquote } from './unquote';

import isRoot = require('is-root');

import { CommandBuilder } from './commandBuilder';

import { notifier } from './notifier';

const executingAsRoot = isRoot();

if (executingAsRoot) {
  console.log(`Running as:  ${executingAsRoot ? 'SUDO'.red : 'normal user'.green}`)
}

export function executor(exec: { commandText: string, argsIn: string[], argsAsIs?: string[] }) {

  let { commandText, argsIn = [], argsAsIs = [], } = exec;
  if (argsIn.length > 1) {
    argsIn = process.argv.slice(2);
  } else {
    if (argsAsIs.length > 1) {
      argsIn = argsIn.concat(process.argv.slice(2))
    }
  }

  notifier(); // Update notifier.

  const commands = new CommandBuilder();

  let blast: DBlastMode;
  let verbose = true;
  let brief = false;
  let noLines = false;
  let loud = false;
  let lineEnding: 'none' | 'default' | 'cr' | 'crlf' | 'lf';
  let global = false;

  let dualPhaseMode: 'package-relink' | 'uninstall-install' | '';
  let unlinkMode = false;

  let changeDirTo: string[] = undefined;
  const startingDirectory = process.cwd();

  commands.addCommandOption(['--list-globals', '--list-global', '-list-globals', '-list-global'],
    (nArgs, argsToPass, argsToEnd) => {
      argsToPass.push('ls', '--global', '--depth', '0');
      if (lineEnding === 'default') {
        lineEnding = 'none';
      }
    });

  commands.addCommandOption(['--cd', '-cd', 'cd'],
    (nArgs) => {
      changeDirTo = nArgs;
    }, {
      nArgs: 1,
    });
  commands.addCommandOption(['--loud', '-loud'],
    () => {
      loud = true;
    });
  commands.addCommandOption(['--global', '-g'],
    () => {
      global = true;
      if (lineEnding === 'default') {
        lineEnding = 'none';
      }
    }, {
      justPeek: true,
    });
  commands.addCommandOption(['--run', '-run'],
    (nArgs, argsToPass, argsToEnd) => {
      argsToPass.push('run');
      if (lineEnding === 'default') {
        lineEnding = 'none';
      }
    });

  commands.addCommandOption(['--dev', '-dev'],
    (nArgs, argsToPass) => {
      argsToPass.push('--save-dev')
    });
  commands.addCommandOption(['--package-unlink'],
    (nArgs, argsToPass) => {
      argsToPass.push('uninstall', '-g');
      unlinkMode = true;
    });
  commands.addCommandOption(['--package-relink'],
    (nArgs, argsToPass) => {
      dualPhaseMode = 'package-relink'
    });
  commands.addCommandOption(['--uninstall-install', '--un-in', '--unin', 'uninstall-install', 'un-in', 'unin'],
    (nArgs, argsToPass) => {
      dualPhaseMode = 'uninstall-install'
    });
  commands.addCommandOption(['--blast', '--blast-all', 'blast'],
    () => blast = 'all');
  commands.addCommandOption(['--blast-node', '--blast-node_modules', '--blast-node-modules', 'blast-node', 'blast-node_modules', 'blast-node-modules'],
    () => blast = 'node');
  commands.addCommandOption(['--blast-lock', 'blast-lock'],
    () => blast = 'lock');
  commands.addCommandOption(['--no-lines', '--no-line'],
    () => noLines = true);

  commands.addCommandOption(['--line-crlf', '--lines-crlf'],
    () => lineEnding = 'crlf');
  commands.addCommandOption(['--line-lf', '--lines-lf'],
    () => lineEnding = 'lf');
  commands.addCommandOption(['--line-cr', '--lines-cr'],
    () => lineEnding = 'cr');

  const commandsResult = commands.processCommands(argsIn);
  const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;

  // const argvParsed = argv3.parse;

  let changeWorkingDirBackTo: (from: string) => void = undefined;

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

    if (lineEnding === 'default') {
      // read from .get config, etc.
      lineEnding = 'crlf';
    }

    if (noLines || !lineEnding) {
      lineEnding = 'none';
    }

    if (global) {
      console.log(`In ${'global mode'.yellow}...`);
    }

    // console.log(`argv: ${chalk.yellow(JSON.stringify(argv, null, 1))}`);

    let spawnCaller = spawnerNpm;

    const startingPromise = Promise.resolve()
    let blastPromise = startingPromise;
    if (blast) {
      blastPromise = spawnerBlast(blast, false);
    }

    let argsPass1 = [].concat(argsToPassLead).concat(argsToPass).concat(argsToPassAdditional);
    let argsPass2 = [].concat(argsPass1);

    let npmPromise = blastPromise;

    let dualCommandName = undefined;
    if (dualPhaseMode === 'package-relink') {
      dualCommandName = 'package-relink';
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
        if (dualPhaseMode === 'uninstall-install') {
          npmPromise = npmPromise.then(() =>
            spawnCaller(['uninstall'].concat(argsPass1), verbose))
            .then(() =>
              spawnCaller(['install'].concat(argsPass2), verbose)
            );
        } else if (dualPhaseMode === 'package-relink') {
          npmPromise = npmPromise.then(() =>
            spawnCaller(['uninstall', '-g'].concat(argsPass1), verbose))
            .then(() =>
              spawnCaller(['link'].concat(argsPass2), verbose)
            );
        } else {
          console.error(`Unknown dual-phase-mode '${(dualPhaseMode as string).red}'`);
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
    if (lineEnding !== 'none') {
      linesPromise = linesPromise.then(() => {
        return spawnerLines(lineEnding, verbose);
      })
    }

    if (linesPromise === startingPromise) {
      console.warn(`${'Nothing was executed!'.yellow}`);
    }

    return linesPromise.tap(() => {
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

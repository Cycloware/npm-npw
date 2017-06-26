import 'colors';
import chalk = require('chalk');

import { DBlastMode, spawnerNpm, spawnerLines, spawnerBlast } from './npm/spawner';

import fs = require('fs-extra-promise');
import path = require('path');
import del = require('del');

import { unquote } from './unquote';

import isRoot = require('is-root');

import { notifier } from './notifier';

import { CommandBuilder } from './commandBuilder';
import { ChangeDirectory } from './changeDirectory';

import { getChangeDirectoryToWithThrow } from './getChangeDirectoryToWithThrow';
import { getStatInfo } from './getStatInfo';

import { GlobalLogger as _log } from './logger';

const executingAsRoot = isRoot();

if (executingAsRoot) {
  _log.trace(`Running as:  ${executingAsRoot ? 'SUDO'.red : 'normal user'.green}`)
}

export async function executor(exec: { commandText: string, argsIn: string[], argsAsIs?: string[] }): Promise<string> {

  let { commandText, argsIn = [], argsAsIs = [], } = exec;
  if (argsIn.length === 0) {
    argsIn = process.argv.slice(2);
  } else {
    if (argsAsIs.length === 0) {
      argsIn = argsIn.concat(process.argv.slice(2))
    }
  }

  notifier(); // Update notifier.

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

  const commands = CommandBuilder.Start()
    .command(['--list-globals', '--list-global', '-list-globals', '-list-global'],
    (nArgs, argsToPass, argsToEnd) => {
      argsToPass.push('ls', '--global', '--depth', '0');
      if (lineEnding === 'default') {
        lineEnding = 'none';
      }
    })
    .command(['--cd', '-cd', 'cd'],
    (nArgs) => {
      changeDirTo = nArgs
    }, {
      nArgs: 1,
    })
    .command(['--loud', '-loud'],
    () => {
      loud = true
    })
    .command(['--global', '-g'],
    () => {
      global = true
      if (lineEnding === 'default') {
        lineEnding = 'none'
      }
    }, {
      justPeek: true,
    })
    .command(['--run', '-run'],
    (nArgs, argsToPass, argsToEnd) => {
      argsToPass.push('run')
      if (lineEnding === 'default') {
        lineEnding = 'none'
      }
    })
    .command(['--dev', '-dev'],
    (nArgs, argsToPass) => {
      argsToPass.push('--save-dev')
    })
    .command(['--package-unlink'],
    (nArgs, argsToPass) => {
      argsToPass.push('uninstall', '-g')
      unlinkMode = true
    })
    .command(['--package-relink'],
    (nArgs, argsToPass) => {
      dualPhaseMode = 'package-relink'
    })
    .command(['--uninstall-install', '--un-in', '--unin', 'uninstall-install', 'un-in', 'unin'],
    (nArgs, argsToPass) => {
      dualPhaseMode = 'uninstall-install'
    })
    .command(['--blast', '--blast-all', 'blast'],
    () => blast = 'all')
    .command(['--blast-node', '--blast-node_modules', '--blast-node-modules', 'blast-node', 'blast-node_modules', 'blast-node-modules'],
    () => blast = 'node')
    .command(['--blast-lock', 'blast-lock'],
    () => blast = 'lock')
    .command(['--no-lines', '--no-line'],
    () => noLines = true)
    .command(['--line-crlf', '--lines-crlf'],
    () => lineEnding = 'crlf')
    .command(['--line-lf', '--lines-lf'],
    () => lineEnding = 'lf')
    .command(['--line-cr', '--lines-cr'],
    () => lineEnding = 'cr')

  const commandsResult = commands.processCommands(argsIn);
  const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;

  return await ChangeDirectory.Async({
    absoluteNewCurrentDirectory: await getChangeDirectoryToWithThrow(changeDirTo, startingDirectory),
  }, async (state) => {
    try {

      if (lineEnding === 'default') {
        // read from .git config, etc.
        lineEnding = 'crlf';
      }

      if (noLines || !lineEnding) {
        lineEnding = 'none';
      }

      if (global) {
        _log.info(`In ${'global mode'.yellow}...`);
      }

      let spawnCaller = spawnerNpm;
      let executionBlocks = 0;

      if (blast) {
        executionBlocks++;
        await spawnerBlast(blast, false);
      }

      let argsPass1 = [].concat(argsToPassLead).concat(argsToPass).concat(argsToPassAdditional);
      let argsPass2 = [].concat(argsPass1);

      let dualCommandName = undefined;
      if (dualPhaseMode === 'package-relink') {
        dualCommandName = 'package-relink';
      } else if (unlinkMode) {
        dualCommandName = 'unlink';
      }

      if (argsToPass.length === 0) {
        if (dualCommandName) {
          let autoDeterminedPackageName = undefined;
          try {
            const config = await fs.readJsonAsync('./package.json');
            if (config) {
              if (typeof config.name === 'string') {
                autoDeterminedPackageName = config.name;
              }
            }
            if (autoDeterminedPackageName) {
              argsPass1 = argsPass1.concat([autoDeterminedPackageName]);
              _log.info(`Using auto-determined package name '${autoDeterminedPackageName.yellow}' for ${dualPhaseMode.cyan} command.  From directory '${process.cwd().gray}'`)
            } else {
              const msg = `${dualPhaseMode.cyan} mode requires at least a package name and one could not be determined in '${process.cwd().gray}'.  Check to see if a ${'package.json'.gray} file exists there or specify a package name'.`;
              _log.error(msg);
              throw new Error(msg.strip);
            }
          }
          catch (err) {
            const msg = `${dualPhaseMode.cyan} mode requires at least a package name and one could not be determined in '${process.cwd().gray}'.  Check to see if a ${'package.json'.gray} file exists there or specify a package name'.  Error: ${chalk.red(err)}`;
            _log.error(msg);
            throw new Error(msg.strip);
          }
        }
      }

      if (argsPass1.length > 0) {
        executionBlocks++;
        if (dualPhaseMode) {

          if (dualPhaseMode === 'uninstall-install') {
            await spawnCaller(['uninstall'].concat(argsPass1), verbose);
            await spawnCaller(['install'].concat(argsPass2), verbose);
          } else if (dualPhaseMode === 'package-relink') {
            await spawnCaller(['uninstall', '-g'].concat(argsPass1), verbose);
            await spawnCaller(['link'].concat(argsPass2), verbose);
          } else {
            const msg = `Unknown dual-phase-mode '${(dualPhaseMode as string).red}'`;
            _log.error(msg);
            throw new Error(msg.strip)
          }
        } else {
          await spawnCaller(argsPass1, verbose);
        }
      }

      if (argsPass1.length < 1) {
        if (dualPhaseMode) {
          const msg = `${dualPhaseMode.cyan} mode requires at least a package name`;
          _log.error(msg);
          throw new Error(msg.strip)
        }
      }

      if (lineEnding !== 'none') {
        executionBlocks++;
        await spawnerLines(lineEnding, verbose);
      }

      if (executionBlocks === 0) {
        _log.warn(`${'Nothing was executed!'.yellow}`);
      }

      return 'All done';
    } catch (err) {
      const msg = `${'Unhandled exception:'.red}  ${chalk.gray.bgBlack(err)}`;
      _log.error(msg);
      throw new Error(msg.strip)
    }
  });
}

import 'colors';

import chalk = require('chalk');

import { DBlastMode, spawnerNpm, spawnerLines, spawnerBlast } from './npm/spawner';

import fs = require('fs-extra-promise');
import path = require('path');

import { unquote } from './unquote';

import { CommandBuilder } from './commandBuilder';
import { ChangeDirectory } from './changeDirectory';

import { getChangeDirectoryToWithThrow } from './getChangeDirectoryToWithThrow';
import { getStatInfo } from './getStatInfo';

import { GlobalLogger as _log } from './logger';

export async function executor(exec: { commandText: string, argsIn?: string[], argsAsIs?: string[], argsToNpm?: string[] }): Promise<any> {

  let { commandText, argsIn = [], argsAsIs = [], argsToNpm = [] } = exec;
  if (argsIn.length === 0) {
    argsIn = process.argv.slice(2);
  } else {
    if (argsAsIs.length === 0) {
      argsIn = argsIn.concat(process.argv.slice(2))
    }
  }

  let verbose = true;
  let global = true;

  let changeDirTo: string[] = undefined;
  const startingDirectory = process.cwd();

  const commands = CommandBuilder.Start()
    .command(['--cd', '-cd', 'cd'],
    ({toPass}) => {
      changeDirTo = toPass;
    }, {
      nArgs: 1,
    })

  const commandsResult = commands.processCommands(argsIn);
  const { actionsMatched, args: { toPass: argsToPass, toPassLead: argsToPassLead, toPassAdditional: argsToPassAdditional } } = commandsResult;

  return await ChangeDirectory.Async({
    absoluteNewCurrentDirectory: await getChangeDirectoryToWithThrow(changeDirTo, startingDirectory),
  }, async (state) => {
    try {
      if (global) {
        _log.info(`In ${'global mode'.yellow}...`);
      }

      let spawnCaller = spawnerNpm;
      let executionBlocks = 0;

      if (argsToPass.length > 0) {
        let argsPass1 = [].concat(argsToPassLead).concat(argsToPass).concat(argsToPassAdditional);

        let allArgs = argsToPass.map(p => [].concat(argsToNpm).concat(argsToPassLead).concat([p]).concat(argsToPassAdditional))

        for (const argX of allArgs) {
          await spawnCaller(argX, verbose);
        }
      }


      if (argsToPass.length < 1) {
        const msg = `${commandText.cyan} mode requires at least a package name`;
        _log.error(msg);
        throw new Error(msg.strip)
      }

      if (executionBlocks === 0) {
        _log.warn(`${'Nothing was executed!'.yellow}`);
      }

      return 'All done';
    } catch (err) {
      const msg = `${'Unhandled exception:'.red}  ${chalk.gray.bgBlack(err)}`;
      _log.error(msg);
      throw new Error(msg.strip);
    }
  });
}
